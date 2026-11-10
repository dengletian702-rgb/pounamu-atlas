# AI landscape and motion edition

## 中文摘要

首图使用内置 **imagegen** 生成，原始文件为 [ai-alpine-hero-v1.png](ai-alpine-hero-v1.png)。网页使用同图的 WebP 版本 `site/assets/optimized/hero-ai-alpine-v1.webp`。这是受新西兰山湖启发的想象风景，并非某条路线或真实地点的摄影记录；页面首屏和图片说明均注明 AI 创作。路线攻略继续使用有来源与授权的摄影作品。

视觉设计借鉴了用户指定的回音谷作品集包中的中心取景窗展开机制，以及 CC 旅行版中地图与沿途站点同步播放的思路。当前页面与动效为本项目重新实现，未复制参考项目的品牌、照片、影片或业务数据。首页保留大风景构图，随原生滚动展开并向远处推近；标题采用自托管艺术字体，正文保留清楚的无衬线字体。可以用页面的动效按钮关闭动画，系统减少动态效果设置也会被尊重。

## Asset and generation method

- Built-in imagegen tool; no CLI or local API-key setup was used for image generation.
- Original: `ai-alpine-hero-v1.png`, 1672 × 941 pixels.
- Website derivative: `site/assets/optimized/hero-ai-alpine-v1.webp`, same composition, WebP-compressed for delivery.
- AI-generated imagined scenery, not evidence of access, geography, current conditions, or a particular route.
- Existing licensed photos and their attribution remain in [IMAGE-CREDITS.md](IMAGE-CREDITS.md).

## Exact generation prompt

```text
Use case: photorealistic-natural. Asset type: immersive travel website hero background, very wide landscape composition approximately 16:9, high resolution, no text. Create a truly arresting cinematic AI landscape inspired by the alpine lakes and valleys of New Zealand's South Island, an artistic imagined landscape rather than a documentary record of a named route. A brilliant deep turquoise glacial lake bends through a vast dramatic alpine valley; monumental dark green mountain silhouettes frame the left and right sides; distant finely detailed jagged snow-capped peaks sit near the upper center, with one striking illuminated summit as the focal point. Soft low golden sunlight breaks through a dark passing storm to illuminate the lake, and luminous low mist threads the valley, with rich natural emerald, petrol blue and restrained amber highlights. Wide-angle editorial landscape photograph aesthetic, powerful scale and depth, realistic rock, snow and water texture, sophisticated photographic color grading, natural atmosphere, no fantasy architecture, no people, no vehicles, no buildings, no animals, no graphic illustration, no logos, no typography, no watermark. Keep the central 60 percent of the image visually compelling so it can be cropped for a tall phone screen. Keep darker uncluttered space across the lower quarter for a large white website title. This image will slowly zoom as the viewer scrolls, so retain fine detail across the frame and a strong distant focal point.
```

## Interaction intent

- A large landscape window expands to the viewport over the first scroll section. The image also slowly scales toward its distant focal point. Native scrolling remains available.
- Introductory and closing captions exchange emphasis as the window opens. Artistic headings reveal their characters; supporting copy and images enter in a quieter sequence.
- Route playback is visitor-triggered, with a moving mode marker, preserved route line patterns and synchronised stop labels. It shows section progress rather than invented live distances or times.
- Motion can be disabled. With reduced motion, content is shown immediately and the introductory section loses its additional scroll height.

The font is a self-hosted subset of **Ma Shan Zheng** from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/mashanzheng), under the [SIL Open Font License](site/assets/fonts/OFL.txt). It is a website asset; it was not installed on the Mac. Body text uses system sans-serif fonts.

## Approved background material

用户确认的方向是**浅岩灰绿＋矿物纤维地图纸**。浅色阅读区使用轻薄的纸纤维、岩粉颗粒感；深色章节以同一材质染成森林色，呈现低反光的磨砂表面。纹理不覆盖首图和线路摄影，不改变资料或路线信息。

- Original AI texture: [mineral-paper-texture-v1.png](mineral-paper-texture-v1.png), 1254 × 1254 pixels.
- Optimised tile: `site/assets/optimized/mineral-paper-texture-v1.webp`, 640 × 640 pixels, 53,022 bytes. It is embedded in the local stylesheet so no additional service or external asset request is required.
- Palette: light paper `#e5e9e0`, tinted paper `#dce4d8`, forest material `#19332b`, ink `#1a3d32`, copper accent `#98532f`.
- Built-in imagegen mode was used. This is a digitally created decorative material, not a claim about a physical paper product.

Exact texture prompt:

```text
Use case: photorealistic-natural. Asset type: seamless square material texture for the background of a refined New Zealand travel field guide website. Create only the close-up flat surface of pale mineral-fibre map paper, an authentic tactile blend of fine cotton paper fibres, very fine stone powder and barely visible weathered mineral speckles. Cool light sage-grey and warm mist-grey, approximately #e3e8df, with small natural variations. Matte, dry, softly pressed, uncoated, quiet and sophisticated. Make the fine fibres and mineral grain visible up close but low contrast enough for dark body text to be clearly readable over the surface. Flat, even diffuse lighting; no scene or perspective. Seamless tileable edges, no directional shadow, no vignette, no gradient, no folds, no rips, no dirty stains, no yellow antique paper, no marble veins, no map lines, no mountains, no objects, no writing, no letters, no logo or watermark. Avoid a synthetic digital noise appearance; this should feel like a real sheet of carefully made expedition sketchbook paper. Fill the entire square with the material surface.
```


> v3 note (2026-11-10): the full-size AI originals named in this file (`ai-alpine-hero-v1.png`, `mineral-paper-texture-v1.png`) are not kept in this repository. The published files are `docs/assets/optimized/hero-ai-alpine-v1.webp` and `docs/assets/optimized/mineral-paper-texture-v1.webp`. The site labels the opening image as AI-generated; AI images are never used to stand for a real route or venue.
