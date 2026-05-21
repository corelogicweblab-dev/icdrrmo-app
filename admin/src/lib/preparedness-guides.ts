export type PrepareTopicId =
  | "go-bag"
  | "family-plan"
  | "evac-route"
  | "first-aid"
  | "documents"
  | "water"
  | "meds"
  | "radio";

export type PrepareGuide = {
  id: PrepareTopicId;
  icon: "bag" | "users" | "route" | "heart" | "file" | "water" | "pill" | "radio";
  titleEn: string;
  titleTl: string;
  summaryEn: string;
  summaryTl: string;
  stepsEn: string[];
  stepsTl: string[];
  tipsEn: string[];
  tipsTl: string[];
};

export const PREPARE_GUIDES: PrepareGuide[] = [
  {
    id: "go-bag",
    icon: "bag",
    titleEn: "72-hour go bag",
    titleTl: "Go bag (72 oras)",
    summaryEn: "A ready bag helps your family survive the first three days after a disaster.",
    summaryTl: "Handang bag ay tumutulong sa pamilya sa unang tatlong araw pagkatapos ng sakuna.",
    stepsEn: [
      "Use a waterproof backpack or duffel per family member.",
      "Pack ready-to-eat food, water, clothes, flashlight, whistle, and cash.",
      "Include copies of IDs, phone chargers, and a small first-aid kit.",
      "Store near the exit; check every 6 months and after typhoons.",
    ],
    stepsTl: [
      "Gumamit ng waterproof backpack o duffel bawat miyembro ng pamilya.",
      "Maglagay ng pagkain, tubig, damit, flashlight, whistle, at pera.",
      "Isama ang kopya ng ID, charger, at maliit na first-aid kit.",
      "Ilagay malapit sa pintuan; suriin tuwing 6 na buwan at pagkatapos ng bagyo.",
    ],
    tipsEn: ["Label each bag with name and barangay.", "Add infant formula or pet supplies if needed."],
    tipsTl: ["Lagyan ng pangalan at barangay ang bawat bag.", "Magdagdag ng gatas ng sanggol o supplies ng alaga kung kailangan."],
  },
  {
    id: "family-plan",
    icon: "users",
    titleEn: "Family emergency plan",
    titleTl: "Plano ng pamilya sa emergency",
    summaryEn: "Everyone should know where to meet, who to call, and how to evacuate.",
    summaryTl: "Dapat alam ng bawat isa kung saan magkikita, sino ang tatawagan, at paano lumikas.",
    stepsEn: [
      "Pick two meeting places: one near home, one outside the barangay.",
      "Write ICE contacts on phones and on paper in the go bag.",
      "Assign who helps elders, children, and persons with disability.",
      "Practice the plan twice a year with your barangay.",
    ],
    stepsTl: [
      "Pumili ng dalawang tagpuan: malapit sa bahay at labas ng barangay.",
      "Isulat ang ICE contacts sa telepono at sa papel sa go bag.",
      "Italaga kung sino ang tutulong sa matatanda, bata, at PWD.",
      "Sanayin ang plano dalawang beses sa isang taon kasama ang barangay.",
    ],
    tipsEn: ["Share the plan with your barangay chairman.", "Save ICDRRMO hotline in all phones."],
    tipsTl: ["Ibahagi ang plano sa kapitan ng barangay.", "I-save ang hotline ng ICDRRMO sa lahat ng telepono."],
  },
  {
    id: "evac-route",
    icon: "route",
    titleEn: "Evacuation route",
    titleTl: "Ruta ng paglikas",
    summaryEn: "Know the fastest safe route to your assigned evacuation center before flood or fire.",
    summaryTl: "Alamin ang pinakamabilis at ligtas na daan patungo sa evacuation center bago ang baha o sunog.",
    stepsEn: [
      "Open the Map tab and find nearest evacuation centers.",
      "Walk or drive the route once in good weather.",
      "Note bridges or roads that flood first in your barangay.",
      "If SMS or data fails, follow barangay marshals and sirens.",
    ],
    stepsTl: [
      "Buksan ang Map tab at hanapin ang pinakamalapit na evacuation center.",
      "Lakarin o sakyan ang ruta minsan kapag maayos ang panahon.",
      "Tandaan ang tulay o kalsadang unang binabaha sa inyong barangay.",
      "Kung walang signal, sundin ang marshals at sirena ng barangay.",
    ],
    tipsEn: ["Enable GPS on this app for distance to shelters.", "Keep fuel or charge for vehicles."],
    tipsTl: ["I-on ang GPS sa app para sa distansya sa shelter.", "Maghanda ng gasolina o kargang sasakyan."],
  },
  {
    id: "first-aid",
    icon: "heart",
    titleEn: "First aid kit",
    titleTl: "First aid kit",
    summaryEn: "Treat minor injuries during response delays; do not replace professional care.",
    summaryTl: "Gamutin ang maliliit na sugat habang naghihintay ng tulong; hindi pamalit sa doktor.",
    stepsEn: [
      "Stock bandages, antiseptic, gloves, scissors, tape, and thermometer.",
      "Add personal medicines and allergy card in the kit.",
      "Learn basic bleeding control and CPR from barangay health workers.",
      "Replace expired items every year.",
    ],
    stepsTl: [
      "Maglagay ng bandage, antiseptic, gloves, gunting, tape, at thermometer.",
      "Isama ang personal na gamot at allergy card.",
      "Matuto ng basic bleeding control at CPR mula sa health workers.",
      "Palitan ang expired items taun-taon.",
    ],
    tipsEn: ["Keep one kit at home and a mini kit in the go bag."],
    tipsTl: ["Magtabi ng isang kit sa bahay at maliit sa go bag."],
  },
  {
    id: "documents",
    icon: "file",
    titleEn: "Important documents",
    titleTl: "Mahahalagang dokumento",
    summaryEn: "Protect IDs and property papers so you can access aid and return home faster.",
    summaryTl: "Protektahan ang ID at papeles para mabilis makakuha ng tulong at makauwi.",
    stepsEn: [
      "Place birth certificates, titles, insurance, and school records in a zip pouch.",
      "Scan or photograph each document; save encrypted copy if possible.",
      "Keep originals in waterproof bag inside the go bag.",
      "Do not leave originals in flooded areas of the house.",
    ],
    stepsTl: [
      "Ilagay ang birth certificate, titulo, insurance, at school records sa zip pouch.",
      "I-scan o kuhanan ng larawan; i-save ang kopya kung kaya.",
      "Itago ang original sa waterproof bag sa loob ng go bag.",
      "Huwag iwan ang original sa bahaging madaling bahaan.",
    ],
    tipsEn: ["Include barangay clearance and medical abstract for SOS."],
    tipsTl: ["Isama ang barangay clearance at medical abstract para sa SOS."],
  },
  {
    id: "water",
    icon: "water",
    titleEn: "Drinking water (3 days)",
    titleTl: "Inuming tubig (3 araw)",
    summaryEn: "Plan at least 3 liters per person per day for drinking and cooking.",
    summaryTl: "Magplano ng hindi bababa sa 3 litro bawat tao bawat araw para inom at luto.",
    stepsEn: [
      "Store sealed bottles or food-grade containers off the floor.",
      "Rotate stock every 6 months; write dates on containers.",
      "If tap water is unsafe, boil or use approved purification tablets.",
      "Know barangay water tank or distribution points.",
    ],
    stepsTl: [
      "Mag-imbak ng sealed bottles o food-grade containers na hindi nakadikit sa sahig.",
      "Palitan tuwing 6 na buwan; lagyan ng petsa ang lalagyan.",
      "Kung hindi ligtas ang gripo, pakuluan o gumamit ng purification tablets.",
      "Alamin ang water tank o distribution points ng barangay.",
    ],
    tipsEn: ["After floods, assume water is contaminated until tested."],
    tipsTl: ["Pagkatapos ng baha, ituring na contaminated ang tubig hanggang masuri."],
  },
  {
    id: "meds",
    icon: "pill",
    titleEn: "Medication supply (7 days)",
    titleTl: "Gamot (7 araw)",
    summaryEn: "Maintain a week of prescription and chronic medicines plus list of dosages.",
    summaryTl: "Magtabi ng isang linggong reseta at chronic meds kasama ang listahan ng dosis.",
    stepsEn: [
      "Ask your doctor for extra supply before typhoon season.",
      "Keep medicines in original bottles with labels.",
      "Store a written dosage list in English and Filipino in the go bag.",
      "Include inhalers, insulin, or devices with spare batteries.",
    ],
    stepsTl: [
      "Humingi ng dagdag na supply sa doktor bago ang tag-ulan.",
      "Itago sa original na bote na may label.",
      "Maglagay ng nakasulat na dosage list sa Ingles at Filipino sa go bag.",
      "Isama ang inhaler, insulin, o device na may spare batteries.",
    ],
    tipsEn: ["Your Profile in this app forwards medical info on SOS."],
    tipsTl: ["Ang Profile sa app ay ipinapadala ang medical info kapag SOS."],
  },
  {
    id: "radio",
    icon: "radio",
    titleEn: "Radio & power",
    titleTl: "Radyo at power bank",
    summaryEn: "Stay informed when mobile networks fail during disasters.",
    summaryTl: "Manatiling may balita kapag bumagsak ang mobile network sa sakuna.",
    stepsEn: [
      "Keep a battery or crank AM/FM radio with spare batteries.",
      "Charge power banks weekly; label capacity and date.",
      "Save local AM stations and PAGASA frequencies on paper.",
      "Use phone sparingly; enable low-power mode during alerts.",
    ],
    stepsTl: [
      "Maghanda ng battery o crank AM/FM radio na may spare batteries.",
      "I-charge ang power bank linggo-linggo; lagyan ng petsa.",
      "I-save ang local AM stations at PAGASA sa papel.",
      "Tipid sa telepono; low-power mode kapag may alerto.",
    ],
    tipsEn: ["This app works when data returns; radio works when it does not."],
    tipsTl: ["Gumagana ang app kapag may data; ang radyo kapag wala."],
  },
];

export function getPrepareGuide(id: string): PrepareGuide | undefined {
  return PREPARE_GUIDES.find((g) => g.id === id);
}

export const PREPARE_TOPIC_IDS = PREPARE_GUIDES.map((g) => g.id);
