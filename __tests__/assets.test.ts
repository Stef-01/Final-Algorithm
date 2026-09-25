import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

// Every `require('…/assets/…')` in src, resolved to an absolute path.
const requiredAssets = sourceFiles(srcDir).flatMap((file) =>
  [...fs.readFileSync(file, 'utf8').matchAll(/require\('([^']*assets\/[^']+)'\)/g)].map((m) => ({
    file: path.relative(root, file),
    asset: path.resolve(path.dirname(file), m[1]),
  })),
);

const signatures: Record<string, (b: Buffer) => boolean> = {
  '.png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.jpg': (b) => b[0] === 0xff && b[1] === 0xd8,
  '.jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
  '.webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  '.mp4': (b) => b.toString('ascii', 4, 8) === 'ftyp',
  '.otf': (b) => b.toString('ascii', 0, 4) === 'OTTO',
};

describe('asset seeding', () => {
  it('finds asset references in the source', () => {
    expect(requiredAssets.length).toBeGreaterThan(0);
  });

  it.each(requiredAssets.map((r) => [path.relative(root, r.asset), r]))(
    '%s exists and is a valid file',
    (_name, { asset }) => {
      expect(fs.existsSync(asset)).toBe(true);
      const bytes = fs.readFileSync(asset);
      expect(bytes.length).toBeGreaterThan(1024);
      const check = signatures[path.extname(asset).toLowerCase()];
      expect(check).toBeDefined();
      expect(check(bytes)).toBe(true);
    },
  );

  it('uses every image in assets/images and assets/clinicians (no orphaned files)', () => {
    const used = new Set(requiredAssets.map((r) => r.asset));
    const orphans = ['assets/images', 'assets/clinicians']
      .flatMap((dir) => fs.readdirSync(path.join(root, dir)).map((f) => path.join(root, dir, f)))
      .filter((f) => !used.has(f));
    expect(orphans.map((f) => path.relative(root, f))).toEqual([]);
  });
});
