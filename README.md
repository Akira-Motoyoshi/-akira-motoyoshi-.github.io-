# Messi 3D Career Atlas

MapLibre GL JS と OpenFreeMap を使った、GitHub Pages でそのまま公開できる静的 3D Web GIS ストーリーマップです。Lionel Messi の出生地 Rosario から Newell's Old Boys、Barcelona、Argentina 代表、PSG、Inter Miami までを、映画のような自動カメラで巡ります。

## 使用技術

- MapLibre GL JS
- OpenFreeMap `liberty` style
- OpenStreetMap / OpenMapTiles 系のベクター地図データ
- HTML / CSS / JavaScript のみ
- MapLibre `fill-extrusion` による 3D 建物表現
- Web Audio API によるオリジナルBGM生成

## ファイル構成

```txt
index.html
style.css
main.js
data/scenes.js
data/messi-scenes.js
enhancements.css
enhancements.js
README.md
```

## GitHub Pages での公開手順

1. このフォルダのファイルを GitHub リポジトリに push します。
2. GitHub のリポジトリ画面で `Settings` → `Pages` を開きます。
3. `Build and deployment` の `Source` を `Deploy from a branch` にします。
4. ユーザーサイトの場合は `Akira-Motoyoshi.github.io` リポジトリの `main` または `gh-pages` の `/root` を選び、保存します。
5. 数十秒から数分後、`https://akira-motoyoshi.github.io/` にアクセスします。

CDN と OpenFreeMap の公開タイルを使うため、API キーやビルド作業は不要です。

## 操作方法

- 基本は自動再生です。
- `Pause` / `Play` で自動再生を切り替えます。
- `Next` / `Previous` で前後のシーンに移動します。
- `Sound` でBGMをオンにします。ブラウザ仕様上、音はユーザー操作後に開始します。
- キーボードでは `Space`、左右矢印キーも使えます。

## シーン一覧

1. 1987 - Rosario, Argentina
2. 1992 - Club Grandoli, Rosario, Argentina
3. 1994 - Newell's Old Boys, Rosario, Argentina
4. 2000 - Barcelona, Spain
5. 2004-2021 - Camp Nou, Barcelona, Spain
6. 2005-2022 - Buenos Aires, Argentina
7. 2005-2023 - Estadio Monumental, Buenos Aires, Argentina
8. 2022 - Lusail Stadium, Qatar
9. 2021 - Paris, France
10. 2021-2023 - Parc des Princes, Paris, France
11. 2023 - Miami, United States
12. 2023- - Inter Miami Stadium, Fort Lauderdale, United States

## データ出典と注意書き

- 背景地図と建物データは OpenFreeMap が配信する OpenStreetMap / OpenMapTiles 系データを利用しています。
- 地点座標は各都市・クラブ施設・スタジアム周辺の代表点です。作品演出用のため、出生家や練習場入口などの厳密な一点を示すものではありません。
- 画像は Wikimedia Commons 上の Creative Commons ライセンス写真を使用し、カード内に作者・ライセンスを表示しています。
- 若年期の本人写真は自由利用できるものが限られるため、Rosario や Newell's 周辺の再利用可能な写真で時期を補っています。
- BGMは外部音源を使わず、Web Audio API でブラウザ内生成するオリジナル音源です。
- 人物・クラブ名は説明目的で使用しています。

## 画像クレジット

- TitiNicola / Wikimedia Commons - CC BY-SA 4.0
- PitchdGroundhopping / Wikimedia Commons - CC BY-SA 4.0
- Tsutomu Takasu / Flickr via Wikimedia Commons - CC BY 2.0
- M.Caimary / Wikimedia Commons - CC BY 2.0
- Inisheer / Wikimedia Commons - CC BY 3.0
- Kirill Venediktov / soccer.ru via Wikimedia Commons - CC BY-SA 3.0
- Tasnim News Agency / Wikimedia Commons - CC BY 4.0
- Bigmatbasket / Wikimedia Commons - CC BY-SA 4.0
- Hayden Schiff / Wikimedia Commons - CC BY 4.0
