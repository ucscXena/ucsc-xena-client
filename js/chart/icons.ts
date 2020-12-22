export type IconsId =
  | "bar"
  | "box"
  | "scatter"
  | "violin";

export type IconsKey =
  | "Bar"
  | "Box"
  | "Scatter"
  | "Violin";

export enum Icons {
  Bar = "bar",
  Box = "box",
  Scatter = "scatter",
  Violin = "violin",
}

export const ICONS_CODEPOINTS: { [key in Icons]: string } = {
  [Icons.Bar]: "61697",
  [Icons.Box]: "61698",
  [Icons.Scatter]: "61699",
  [Icons.Violin]: "61700",
};
