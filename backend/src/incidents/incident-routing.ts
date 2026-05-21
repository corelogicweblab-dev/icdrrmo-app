import { EmergencyType, RoutedAgency } from '@prisma/client';

/** Maps incident type → agency queue per ICDRRMO SMART routing policy. */
export function resolveRoutedAgency(type: EmergencyType): RoutedAgency {
  switch (type) {
    case EmergencyType.FIRE:
      return RoutedAgency.BFP;
    case EmergencyType.CRIME:
      return RoutedAgency.PNP;
    case EmergencyType.MEDICAL_EMERGENCY:
      return RoutedAgency.ICDRRMO_MEDICAL;
    case EmergencyType.FLOOD:
    case EmergencyType.TYPHOON:
      return RoutedAgency.ICDRRMO_OPS;
    default:
      return RoutedAgency.ICDRRMO_OPS;
  }
}

export function routedAgencyLabel(agency: RoutedAgency): string {
  switch (agency) {
    case RoutedAgency.BFP:
      return 'Bureau of Fire Protection (BFP)';
    case RoutedAgency.PNP:
      return 'Philippine National Police (PNP)';
    case RoutedAgency.ICDRRMO_MEDICAL:
      return 'ICDRRMO medical responders';
    case RoutedAgency.ICDRRMO_OPS:
      return 'ICDRRMO operations (EOC)';
    default:
      return agency;
  }
}
