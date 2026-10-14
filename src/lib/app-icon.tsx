import { ImageResponse } from "next/og";

export function appIcon(size: number) {
  const fontSize = Math.round(size * 0.42);
  const radius = Math.round(size * 0.22);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3efe6",
        }}
      >
        <div
          style={{
            width: "78%",
            height: "78%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius,
            background: "#1e6b45",
            color: "#f3efe6",
            fontSize,
          }}
        >
          C
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
