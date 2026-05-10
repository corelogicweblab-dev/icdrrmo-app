import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';

/** Firestore collection: full profile; clients read with Firebase Auth (custom token uid = user id). */
export const CITIZEN_PROFILES_COLLECTION = 'citizen_profiles';

/**
 * Mirrors PostgreSQL `users` + `user_profiles` (+ responder summary) into Firestore
 * whenever profiles change (and before issuing a Firebase custom token).
 */
@Injectable()
export class FirestoreMirrorService {
  private readonly log = new Logger(FirestoreMirrorService.name);

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  isEnabled(): boolean {
    return this.firebaseAdmin.isEnabled();
  }

  /** Upsert `citizen_profiles/{userId}` with all non-secret fields from Postgres. */
  async syncUserProfile(userId: string): Promise<void> {
    const firestore = this.firebaseAdmin.getFirestore();
    if (!firestore) return;
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { barangay: true } },
        responder: { include: { vehicle: { select: { id: true, plateNumber: true, name: true } } } },
      },
    });
    if (!u) return;

    const p = u.profile;
    const payload: Record<string, unknown> = {
      userId: u.id,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt?.toISOString?.() ?? null,
      updatedAt: u.updatedAt?.toISOString?.() ?? null,
      profile: p
        ? {
            fullName: p.fullName,
            gender: p.gender,
            birthday: p.birthday?.toISOString?.() ?? null,
            address: p.address,
            streetPurok: p.streetPurok,
            barangayId: p.barangayId,
            barangayName: p.barangay?.name ?? null,
            barangayCode: p.barangay?.code ?? null,
            bloodType: p.bloodType,
            allergies: p.allergies,
            medicalConditions: p.medicalConditions,
            emergencyNotes: p.emergencyNotes,
            profilePhotoUrl: p.profilePhotoUrl,
            validIdUrl: p.validIdUrl,
            availabilityStatus: p.availabilityStatus,
            setupCompleted: p.setupCompleted,
            lastKnownBattery: p.lastKnownBattery,
            lastSignalQuality: p.lastSignalQuality,
            profileUpdatedAt: p.updatedAt?.toISOString?.() ?? null,
          }
        : null,
      responder: u.responder
        ? {
            id: u.responder.id,
            status: u.responder.status,
            badgeNumber: u.responder.badgeNumber,
            vehicleId: u.responder.vehicleId,
            vehiclePlate: u.responder.vehicle?.plateNumber ?? null,
            vehicleName: u.responder.vehicle?.name ?? null,
          }
        : null,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'postgresql_mirror',
    };

    try {
      await firestore.collection(CITIZEN_PROFILES_COLLECTION).doc(u.id).set(payload, { merge: true });
    } catch (e) {
      this.log.warn(`syncUserProfile failed for ${userId}: ${e instanceof Error ? e.message : e}`);
    }
  }
}
