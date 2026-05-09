import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BarangaysService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.barangay.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async userCountsByBarangay() {
    const grouped = await this.prisma.userProfile.groupBy({
      by: ['barangayId'],
      where: { barangayId: { not: null } },
      _count: { _all: true },
    });
    const barangays = await this.prisma.barangay.findMany({ orderBy: { name: 'asc' } });
    const countMap = new Map<string | null, number>();
    for (const g of grouped) {
      countMap.set(g.barangayId, g._count._all);
    }
    return barangays.map((b) => ({
      barangay: b,
      registeredUsers: countMap.get(b.id) ?? 0,
    }));
  }
}
