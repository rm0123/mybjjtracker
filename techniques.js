const TECHNIQUE_BANK = [
  {
    id: "dominant-positions",
    label: "Positions dominantes",
    techniques: [
      "Montée (Mount)",
      "Montée haute (High Mount)",
      "S-Mount",
      "Montée technique (Technical Mount)",
      "Contrôle latéral (Side Control)",
      "North-South",
      "Knee on Belly",
      "Contrôle du dos (Back Control)",
      "Body Triangle",
      "Kesa Gatame / Scarf Hold"
    ]
  },
  {
    id: "guards",
    label: "Gardes",
    techniques: [
      "Garde fermée",
      "Garde ouverte",
      "Garde assise",
      "Half Guard",
      "Knee Shield / Z Guard",
      "Butterfly Guard",
      "De La Riva",
      "Reverse De La Riva",
      "Spider Guard",
      "Lasso Guard",
      "X Guard",
      "Single Leg X",
      "K Guard",
      "50/50",
      "Deep Half Guard"
    ]
  },
  {
    id: "passes",
    label: "Passages de garde",
    techniques: [
      "Toreando Pass",
      "Knee Slice / Knee Cut",
      "Over-Under Pass",
      "Double Under Pass",
      "Stack Pass",
      "Leg Drag",
      "X-Pass",
      "Long Step Pass",
      "Body Lock Pass",
      "Smash Pass",
      "Tripod Pass",
      "Headquarters Pass",
      "Leg Weave Pass",
      "Single Under Pass"
    ]
  },
  {
    id: "positions",
    label: "Positions",
    techniques: [
      "Turtle",
      "Front Headlock",
      "Headquarters",
      "Standing Base",
      "Combat Base",
      "Dogfight",
      "Single Leg Position",
      "Double Leg Position",
      "Crucifix",
      "Truck Position",
      "Ashigarami",
      "Saddle / Inside Sankaku"
    ]
  },
  {
    id: "escapes",
    label: "Échappées",
    techniques: [
      "Bridge & Roll Escape depuis Mount",
      "Elbow-Knee Escape depuis Mount",
      "Kipping Escape depuis Mount",
      "Frame & Hip Escape depuis Side Control",
      "Underhook Escape depuis Side Control",
      "Running Man Escape",
      "North-South Escape",
      "Knee on Belly Escape",
      "Back Escape - côté étranglement",
      "Back Escape - côté sûr",
      "Turtle Escape",
      "Front Headlock Escape",
      "Technical Stand Up"
    ]
  },
  {
    id: "sweeps",
    label: "Sweeps",
    techniques: [
      "Scissor Sweep",
      "Hip Bump Sweep",
      "Flower Sweep",
      "Pendulum Sweep",
      "Kimura Sweep",
      "Butterfly Sweep",
      "Tripod Sweep",
      "Sickle Sweep",
      "Waiter Sweep",
      "De La Riva Sweep",
      "Reverse De La Riva Sweep",
      "Single Leg X Sweep",
      "X Guard Technical Stand Up",
      "Dogfight / Old School Sweep"
    ]
  },
  {
    id: "chokes",
    label: "Étranglements",
    techniques: [
      "Rear Naked Choke",
      "Cross Collar Choke",
      "Bow & Arrow Choke",
      "Triangle Choke",
      "Arm Triangle",
      "Guillotine",
      "Ezekiel Choke",
      "Baseball Bat Choke",
      "Paper Cutter Choke",
      "North-South Choke",
      "Loop Choke",
      "Clock Choke"
    ]
  },
  {
    id: "joint-locks",
    label: "Clés articulaires",
    techniques: [
      "Armbar depuis Mount",
      "Armbar depuis Guard",
      "Straight Arm Lock",
      "Kimura",
      "Americana",
      "Omoplata",
      "Choi Bar",
      "Tarikoplata",
      "Wrist Lock"
    ]
  },
  {
    id: "leg-locks",
    label: "Clés de jambe",
    techniques: [
      "Straight Ankle Lock",
      "Kneebar",
      "Toe Hold",
      "Calf Slicer",
      "Aoki Lock",
      "Inside Heel Hook",
      "Outside Heel Hook",
      "Estima Lock"
    ]
  },
  {
    id: "takedowns",
    label: "Takedowns",
    techniques: [
      "Double Leg",
      "Single Leg",
      "High Crotch",
      "Ankle Pick",
      "Snapdown",
      "Arm Drag vers le dos",
      "Body Lock Takedown",
      "Outside Trip",
      "Inside Trip",
      "Osoto Gari",
      "Ouchi Gari",
      "Kouchi Gari",
      "Sumi Gaeshi",
      "Collar Drag"
    ]
  },
  {
    id: "transitions",
    label: "Transitions",
    techniques: [
      "Side Control vers Mount",
      "Side Control vers Knee on Belly",
      "Side Control vers North-South",
      "Knee on Belly vers Mount",
      "Mount vers S-Mount",
      "Mount vers Technical Mount",
      "Turtle vers Back Control",
      "Front Headlock vers Back Control",
      "Back Control vers Mount",
      "Closed Guard vers Open Guard",
      "Half Guard vers Dogfight",
      "Guard Retention vers Seated Guard",
      "Passage vers Side Control",
      "Side Control vers Back Take",
      "Technical Stand Up vers Standing"
    ]
  }
];

const TECHNIQUE_COUNT = TECHNIQUE_BANK.reduce((total, category) => total + category.techniques.length, 0);

const DEFAULT_ROAD_TARGETS = [
  "dominant-positions::Montée (Mount)",
  "dominant-positions::Contrôle latéral (Side Control)",
  "dominant-positions::Knee on Belly",
  "dominant-positions::Contrôle du dos (Back Control)",
  "dominant-positions::North-South",
  "guards::Garde fermée",
  "guards::Garde ouverte",
  "guards::Garde assise",
  "guards::Half Guard",
  "guards::Knee Shield / Z Guard",
  "guards::Butterfly Guard",
  "guards::De La Riva",
  "guards::Single Leg X",
  "passes::Toreando Pass",
  "passes::Knee Slice / Knee Cut",
  "passes::Over-Under Pass",
  "passes::Double Under Pass",
  "passes::Stack Pass",
  "passes::Leg Drag",
  "passes::X-Pass",
  "positions::Turtle",
  "positions::Front Headlock",
  "positions::Dogfight",
  "positions::Standing Base",
  "escapes::Bridge & Roll Escape depuis Mount",
  "escapes::Elbow-Knee Escape depuis Mount",
  "escapes::Frame & Hip Escape depuis Side Control",
  "escapes::Underhook Escape depuis Side Control",
  "escapes::Knee on Belly Escape",
  "escapes::Back Escape - côté sûr",
  "escapes::Turtle Escape",
  "escapes::Technical Stand Up",
  "sweeps::Scissor Sweep",
  "sweeps::Hip Bump Sweep",
  "sweeps::Flower Sweep",
  "sweeps::Butterfly Sweep",
  "sweeps::Tripod Sweep",
  "sweeps::De La Riva Sweep",
  "sweeps::Dogfight / Old School Sweep",
  "chokes::Rear Naked Choke",
  "chokes::Cross Collar Choke",
  "chokes::Triangle Choke",
  "chokes::Guillotine",
  "chokes::Ezekiel Choke",
  "chokes::Bow & Arrow Choke",
  "joint-locks::Armbar depuis Mount",
  "joint-locks::Armbar depuis Guard",
  "joint-locks::Kimura",
  "joint-locks::Americana",
  "leg-locks::Straight Ankle Lock",
  "takedowns::Double Leg",
  "takedowns::Single Leg",
  "takedowns::Snapdown",
  "takedowns::Body Lock Takedown",
  "transitions::Side Control vers Mount",
  "transitions::Side Control vers Knee on Belly",
  "transitions::Turtle vers Back Control",
  "transitions::Front Headlock vers Back Control",
  "transitions::Back Control vers Mount"
];
