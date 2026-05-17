#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from PIL import Image


ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Measurement:
    name: str
    bbox: tuple[int, int, int, int] | str


def dominant_colors(path: Path, limit: int = 8) -> str:
    image = Image.open(path).convert("RGB")
    counts = Counter(image.getdata())
    return ", ".join(f"#{r:02x}{g:02x}{b:02x} {count}px" for (r, g, b), count in counts.most_common(limit))


def non_bg_bbox(path: Path) -> tuple[int, int, int, int] | str:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    border = []
    for x in range(width):
        border.append(pixels[x, 0])
        border.append(pixels[x, height - 1])
    for y in range(height):
        border.append(pixels[0, y])
        border.append(pixels[width - 1, y])
    bg = Counter(border).most_common(1)[0][0]
    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] != bg:
                xs.append(x)
                ys.append(y)
    if not xs:
        return "not present"
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def color_component_bboxes(path: Path, colors: Iterable[tuple[int, int, int]]) -> dict[str, tuple[int, int, int, int] | str]:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    pixels = image.load()
    wanted = set(colors)
    visited: set[tuple[int, int]] = set()
    largest: dict[tuple[int, int, int], tuple[int, int, int, int, int]] = {}
    for y in range(height):
        for x in range(width):
            color = pixels[x, y]
            if color not in wanted or (x, y) in visited:
                continue
            queue = deque([(x, y)])
            visited.add((x, y))
            xs = []
            ys = []
            while queue:
                cx, cy = queue.popleft()
                xs.append(cx)
                ys.append(cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited and pixels[nx, ny] == color:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            area = len(xs)
            previous = largest.get(color)
            if previous is None or area > previous[4]:
                largest[color] = (min(xs), min(ys), max(xs) + 1, max(ys) + 1, area)
    return {f"#{r:02x}{g:02x}{b:02x} largest": (box[:4] if (box := largest.get((r, g, b))) else "not present") for r, g, b in colors}


def measure(path: Path) -> list[Measurement]:
    image = Image.open(path)
    colors = color_component_bboxes(path, [(255, 139, 61), (255, 241, 209), (255, 245, 235), (255, 255, 255)])
    return [
        Measurement("size", f"{image.width}x{image.height}"),
        Measurement("dominant colors", dominant_colors(path)),
        Measurement("non-bg bbox", non_bg_bbox(path)),
        *[Measurement(name, bbox) for name, bbox in colors.items()],
    ]


def main() -> None:
    for screen in ("06", "07", "08"):
        path = ROOT / f"{screen}-production.png"
        if not path.exists():
            print(f"{screen}: screenshot missing")
            continue
        print(f"## {screen}")
        for item in measure(path):
            print(f"{item.name}: {item.bbox}")


if __name__ == "__main__":
    main()
