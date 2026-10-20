import Phaser from 'phaser';
import { COLORS, FONTS } from './theme.ts';

export type ButtonStyle = 'primary' | 'secondary' | 'danger' | 'disabled';

/** Przycisk dotykowy: akcja przy puszczeniu palca na przycisku (nie zależy od hovera). */
export class Button extends Phaser.GameObjects.Container {
  private bw: number;
  private readonly bh: number;
  private readonly dpr: number;
  private readonly onTap: () => void;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Zone;
  private style: ButtonStyle = 'primary';
  private pressed = false;

  /** Pozycja i rozmiar w pikselach urządzenia; `fontSize` w punktach CSS. */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    dpr: number,
    onTap: () => void,
    fontSize = 15,
  ) {
    super(scene, x, y);
    this.bw = width;
    this.bh = height;
    this.dpr = dpr;
    this.onTap = onTap;
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(width / 2, height / 2, text, {
        fontFamily: FONTS.body,
        fontSize: `${Math.round(fontSize * dpr)}px`,
        fontStyle: '600',
        color: COLORS.buttonText,
      })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(width, height);

    const hit = scene.add.zone(0, 0, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
    this.hit = hit;
    this.add(hit);
    hit.on('pointerdown', () => {
      this.pressed = true;
      this.draw();
    });
    hit.on('pointerout', () => {
      this.pressed = false;
      this.draw();
    });
    hit.on('pointerup', () => {
      const wasPressed = this.pressed;
      this.pressed = false;
      this.draw();
      if (wasPressed) this.onTap();
    });
    scene.add.existing(this);
    this.draw();
  }

  setText(text: string): this {
    if (this.label.text !== text) this.label.setText(text);
    return this;
  }

  setStyle(style: ButtonStyle): this {
    if (style !== this.style) {
      this.style = style;
      this.draw();
    }
    return this;
  }

  /** Zmiana położenia (x) i szerokości — np. dwa przyciski obok siebie zamiast jednego. */
  setSpan(x: number, width: number): this {
    if (x === this.x && width === this.bw) return this;
    this.x = x;
    this.bw = width;
    this.label.setX(width / 2);
    this.hit.setSize(width, this.bh);
    this.setSize(width, this.bh);
    this.draw();
    return this;
  }

  /** Pokazanie/ukrycie razem z wyłączeniem dotyku (ukryty przycisk nie może przechwycić palca). */
  setShown(shown: boolean): this {
    if (shown === this.visible) return this;
    this.setVisible(shown);
    if (shown) this.hit.setInteractive({ useHandCursor: true });
    else this.hit.disableInteractive();
    this.pressed = false;
    return this;
  }

  private draw(): void {
    const g = this.bg;
    const radius = 10 * this.dpr;
    g.clear();
    const fill =
      this.style === 'primary' ? COLORS.goldHex : this.style === 'danger' ? COLORS.dangerHex : COLORS.buttonIdle;
    g.fillStyle(fill, this.pressed ? 0.75 : 1).fillRoundedRect(0, 0, this.bw, this.bh, radius);
    if (this.style === 'secondary' || this.style === 'disabled') {
      g.lineStyle(1.5 * this.dpr, this.style === 'secondary' ? COLORS.tealHex : COLORS.panelBorder, 1);
      g.strokeRoundedRect(0, 0, this.bw, this.bh, radius);
    }
    this.label.setColor(
      this.style === 'secondary' ? COLORS.teal : this.style === 'disabled' ? COLORS.muted : COLORS.buttonText,
    );
  }
}
