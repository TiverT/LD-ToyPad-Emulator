export enum Tagtype {
  "Vehicle",
  "Character",
}
export interface Token {
  id: number;
  uid: string;
  name: string;
  type: Tagtype;
  vehicleUpgradesP23: number;
  vehicleUpgradesP25: number;
  index: number;
  [key: string]: any;
}
