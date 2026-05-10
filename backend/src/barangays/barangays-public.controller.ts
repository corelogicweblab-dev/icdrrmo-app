import { Controller, Get } from '@nestjs/common';
import { BarangaysService } from './barangays.service';

/** Unauthenticated barangay names for citizen registration forms. */
@Controller('barangays')
export class BarangaysPublicController {
  constructor(private readonly barangays: BarangaysService) {}

  @Get('public')
  listPublic() {
    return this.barangays.listPublic();
  }
}
