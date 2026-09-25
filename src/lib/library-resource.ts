export type LibraryResource = {
  id: string;
  kind: "workshop" | "material";
  title: string;
  age: number;
  area: string;
  purpose: string;
  materials: string[];
  criterion: string;
};
