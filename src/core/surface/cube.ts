// Mapa sześcienna wartości na sferze: kosztowny kształt terenu liczony raz („pieczenie”),
// potem tani odczyt z interpolacją dwuliniową w dowolnym punkcie (widok 2D liczy go co klatkę).
// Tylko + − × ÷ sqrt — wynik jednakowy w każdej przeglądarce.

export interface CubeMap {
  res: number;
  /**
   * 6 ścian × (res + 2)². Każda ściana ma ramkę z jednego teksela liczoną za krawędzią ściany
   * (kierunki z przedłużenia jej płaszczyzny), więc interpolacja przy krawędzi używa prawdziwych
   * wartości z sąsiedniej ściany — bez szwów.
   */
  data: Float32Array;
}

/** Kierunek (nieznormalizowany) dla ściany i współrzędnych u, v ∈ [−1, 1]. */
function faceDir(face: number, u: number, v: number): [number, number, number] {
  switch (face) {
    case 0:
      return [1, v, -u];
    case 1:
      return [-1, v, u];
    case 2:
      return [u, 1, -v];
    case 3:
      return [u, -1, v];
    case 4:
      return [u, v, 1];
    default:
      return [-u, v, -1];
  }
}

/** Wypełnia mapę wartościami `fn` w środkach tekseli i w ramce (kierunki znormalizowane). */
export function bakeCube(res: number, fn: (x: number, y: number, z: number) => number): CubeMap {
  const side = res + 2;
  const data = new Float32Array(6 * side * side);
  for (let face = 0; face < 6; face++) {
    for (let j = 0; j < side; j++) {
      const v = ((j - 0.5) / res) * 2 - 1;
      for (let i = 0; i < side; i++) {
        const u = ((i - 0.5) / res) * 2 - 1;
        const [x, y, z] = faceDir(face, u, v);
        const len = Math.sqrt(x * x + y * y + z * z);
        data[(face * side + j) * side + i] = fn(x / len, y / len, z / len);
      }
    }
  }
  return { res, data };
}

/** Wartość w kierunku (x, y, z) — interpolacja dwuliniowa na ścianie. */
export function sampleCube(cube: CubeMap, x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let face: number;
  let u: number;
  let v: number;
  if (ax >= ay && ax >= az) {
    face = x >= 0 ? 0 : 1;
    u = (x >= 0 ? -z : z) / ax;
    v = y / ax;
  } else if (ay >= az) {
    face = y >= 0 ? 2 : 3;
    u = x / ay;
    v = (y >= 0 ? -z : z) / ay;
  } else {
    face = z >= 0 ? 4 : 5;
    u = (z >= 0 ? x : -x) / az;
    v = y / az;
  }
  const { res, data } = cube;
  const side = res + 2;
  // Teksel ramki i = 0 leży o pół teksela za krawędzią ściany (u = −1), więc |u| ≤ 1 nie wychodzi poza ramkę.
  const fi = Math.min(res, Math.max(0, ((u + 1) / 2) * res + 0.5));
  const fj = Math.min(res, Math.max(0, ((v + 1) / 2) * res + 0.5));
  const i0 = Math.floor(fi);
  const j0 = Math.floor(fj);
  const i1 = Math.min(side - 1, i0 + 1);
  const j1 = Math.min(side - 1, j0 + 1);
  const tu = fi - i0;
  const tv = fj - j0;
  const row0 = (face * side + j0) * side;
  const row1 = (face * side + j1) * side;
  const a = data[row0 + i0]! + (data[row0 + i1]! - data[row0 + i0]!) * tu;
  const b = data[row1 + i0]! + (data[row1 + i1]! - data[row1 + i0]!) * tu;
  return a + (b - a) * tv;
}
