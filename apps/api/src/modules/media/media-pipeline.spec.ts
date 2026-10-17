import sharp from "sharp";
import { processImage } from "./media-pipeline.js";

const photo = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#7a3b2e" } });

describe("processImage", () => {
  it("makes WebP renditions, never upscaling, plus a blur placeholder", async () => {
    const input = await photo(2400, 1600).jpeg().toBuffer();
    const out = await processImage(input);
    expect(out.renditions.map((r) => r.width)).toEqual([400, 800, 1200, 1600]);
    expect(out.width).toBe(1600);
    expect(out.height).toBe(1067);
    for (const r of out.renditions) {
      expect((await sharp(r.data).metadata()).format).toBe("webp");
    }
    expect(out.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it("strips metadata such as camera EXIF", async () => {
    const input = await photo(1000, 800)
      .jpeg()
      .withExif({
        IFD0: { Artist: "secret-person", Copyright: "gps-like-data" },
      })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processImage(input);
    for (const r of out.renditions) {
      const meta = await sharp(r.data).metadata();
      expect(meta.exif).toBeUndefined();
      expect(r.data.includes(Buffer.from("secret-person"))).toBe(false);
    }
  });

  it("applies phone orientation before resizing", async () => {
    const input = await photo(400, 300)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const out = await processImage(input);
    expect(out.width).toBe(300);
    expect(out.height).toBe(400);
  });

  it("keeps small images at their own size", async () => {
    const out = await processImage(await photo(300, 260).png().toBuffer());
    expect(out.renditions.map((r) => r.width)).toEqual([300]);
  });

  it.each([
    [
      "a text file pretending to be an image",
      Buffer.from("not an image at all"),
    ],
    [
      "an SVG (could carry scripts)",
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><script>alert(1)</script></svg>',
      ),
    ],
  ])("rejects %s", async (_label, input) => {
    await expect(processImage(input)).rejects.toMatchObject({
      code: "UNSUPPORTED_IMAGE",
    });
  });

  it("rejects GIFs", async () => {
    const gif = await photo(400, 400).gif().toBuffer();
    await expect(processImage(gif)).rejects.toMatchObject({
      code: "UNSUPPORTED_IMAGE",
    });
  });

  it("rejects images that are too small", async () => {
    await expect(
      processImage(await photo(150, 150).png().toBuffer()),
    ).rejects.toMatchObject({
      code: "IMAGE_TOO_SMALL",
    });
  });

  it("rejects images over the pixel limit (decompression bombs)", async () => {
    const input = await photo(500, 500).png().toBuffer();
    await expect(
      processImage(input, { maxPixels: 100_000 }),
    ).rejects.toMatchObject({
      code: "IMAGE_TOO_LARGE",
    });
  });
});
