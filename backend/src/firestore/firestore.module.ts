import { Global, Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirestoreMirrorService } from './firestore-mirror.service';

@Global()
@Module({
  providers: [FirebaseAdminService, FirestoreMirrorService],
  exports: [FirebaseAdminService, FirestoreMirrorService],
})
export class FirestoreModule {}
