export type IconsId =
  | "violin"
  | "scatter"
  | "dot"
  | "box"
  | "bar";

export type IconsKey =
  | "Violin"
  | "Scatter"
  | "Dot"
  | "Box"
  | "Bar";

export enum Icons {
  Violin = "violin",
  Scatter = "scatter",
  Dot = "dot",
  Box = "box",
  Bar = "bar",
}

export const ICONS_CODEPOINTS: { [key in Icons]: string } = {
  [Icons.Violin]: "61697",
  [Icons.Scatter]: "61698",
  [Icons.Dot]: "61699",
  [Icons.Box]: "61700",
  [Icons.Bar]: "61701",
};
