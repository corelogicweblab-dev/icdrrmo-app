/// Mirrors backend [EmergencyType] (Prisma).
enum EmergencyTypeApi {
  fire,
  flood,
  accident,
  medicalEmergency,
  landslide,
  crime,
  earthquake,
  typhoon,
  rescueRequest,
  other;

  /// JSON value for POST /incidents/sos
  String get wireValue {
    switch (this) {
      case EmergencyTypeApi.fire:
        return 'FIRE';
      case EmergencyTypeApi.flood:
        return 'FLOOD';
      case EmergencyTypeApi.accident:
        return 'ACCIDENT';
      case EmergencyTypeApi.medicalEmergency:
        return 'MEDICAL_EMERGENCY';
      case EmergencyTypeApi.landslide:
        return 'LANDSLIDE';
      case EmergencyTypeApi.crime:
        return 'CRIME';
      case EmergencyTypeApi.earthquake:
        return 'EARTHQUAKE';
      case EmergencyTypeApi.typhoon:
        return 'TYPHOON';
      case EmergencyTypeApi.rescueRequest:
        return 'RESCUE_REQUEST';
      case EmergencyTypeApi.other:
        return 'OTHER';
    }
  }

  String get displayLabel {
    switch (this) {
      case EmergencyTypeApi.fire:
        return 'Fire';
      case EmergencyTypeApi.flood:
        return 'Flood';
      case EmergencyTypeApi.accident:
        return 'Vehicular accident';
      case EmergencyTypeApi.medicalEmergency:
        return 'Medical emergency';
      case EmergencyTypeApi.landslide:
        return 'Landslide';
      case EmergencyTypeApi.crime:
        return 'Crime';
      case EmergencyTypeApi.earthquake:
        return 'Earthquake';
      case EmergencyTypeApi.typhoon:
        return 'Typhoon';
      case EmergencyTypeApi.rescueRequest:
        return 'Rescue request';
      case EmergencyTypeApi.other:
        return 'Other';
    }
  }

  static EmergencyTypeApi? tryParseWire(String? raw) {
    if (raw == null) return null;
    for (final e in EmergencyTypeApi.values) {
      if (e.wireValue == raw) return e;
    }
    return null;
  }
}
