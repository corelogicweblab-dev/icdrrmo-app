import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Single Firebase Admin app for Firestore mirror + Auth custom tokens.
 * Custom token `uid` is the same string as PostgreSQL `users.id` so Firestore rules can use `request.auth.uid`.
 */
@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly log = new Logger(FirebaseAdminService.name);
  private firestore: FirebaseFirestore.Firestore | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    try {
      const jsonRaw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim();
      const projectIdEnv = this.config.get<string>('FIREBASE_PROJECT_ID')?.trim();
      const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL')?.trim();
      const privateKeyRaw = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.trim();

      if (jsonRaw) {
        const raw = JSON.parse(jsonRaw) as Record<string, unknown>;
        const projectId = String(raw.project_id ?? raw.projectId ?? '').trim();
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(raw as admin.ServiceAccount),
            ...(projectId ? { projectId } : {}),
          });
        }
        this.firestore = admin.firestore();
        this.log.log(`Firebase Admin ready (Firestore + Auth), project ${projectId || 'default'}).`);
        return;
      }

      if (projectIdEnv && clientEmail && privateKeyRaw) {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: projectIdEnv,
              clientEmail,
              privateKey,
            }),
            projectId: projectIdEnv,
          });
        }
        this.firestore = admin.firestore();
        this.log.log(`Firebase Admin ready (project ${projectIdEnv}).`);
        return;
      }

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        if (!admin.apps.length) {
          admin.initializeApp();
        }
        this.firestore = admin.firestore();
        this.log.log('Firebase Admin ready (GOOGLE_APPLICATION_CREDENTIALS).');
        return;
      }

      this.log.warn(
        'Firebase Admin disabled: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID+FIREBASE_CLIENT_EMAIL+FIREBASE_PRIVATE_KEY for Firestore client access (custom tokens).',
      );
    } catch (e) {
      this.log.error(`Firebase Admin init failed: ${e instanceof Error ? e.message : e}`);
      this.firestore = null;
    }
  }

  isEnabled(): boolean {
    return this.firestore != null;
  }

  getFirestore(): FirebaseFirestore.Firestore | null {
    return this.firestore;
  }

  /** Mint Firebase Auth session; `uid` must equal Nest `users.id` for Firestore rules. */
  async createCustomToken(uid: string, claims: Record<string, string>): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Firebase Admin is not configured');
    }
    return admin.auth().createCustomToken(uid, claims);
  }
}
