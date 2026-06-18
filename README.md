# Messi & Ronaldo 3D Career Atlas

MapLibre GL JS と OpenFreeMap を使った、GitHub Pages でそのまま公開できる静的 3D Web GIS ストーリーマップです。Lionel Messi の出生地から Inter Miami までの軌跡を中心に、後半では Cristiano Ronaldo のキャリア地点を重ねて、2人の移動のスケールを対比します。

## 使用技術

- MapLibre GL JS
- OpenFreeMap `liberty` style
- OpenStreetMap / OpenMapTiles 系のベクター地図データ
- HTML / CSS / JavaScript のみ
- MapLibre `fill-extrusion` による 3D 建物表現

## ファイル構成

```txt
index.html
style.css
main.js
data/scenes.js
README.md
```

## GitHub Pages での公開手順

1. このフォルダのファイルを GitHub リポジトリに push します。
2. GitHub のリポジトリ画面で `Settings` → `Pages` を開きます。
3. `Build and deployment` の `Source` を `Deploy from a branch` にします。
4. `Branch` で `main` / `/root` を選び、保存します。
5. 数十秒から数分後、表示された GitHub Pages URL にアクセスします。

CDN と OpenFreeMap の公開タイルを使うため、API キーやビルド作業は不要です。

## 操作方法

- 基本は自動再生です。
- `Pause` / `Play` で自動再生を切り替えます。
- `Next` / `Previous` で前後のシーンに移動します。
- キーボードでは `Space`、左右矢印キーも使えます。

## シーン一覧

1. 1987 - Rosario, Argentina - Messi
2. 1992 - Club Grandoli, Rosario, Argentina - Messi
3. 1994 - Newell's Old Boys, Rosario, Argentina - Messi
4. 2000 - Barcelona, Spain - Messi
5. 2004-2021 - Camp Nou, Barcelona, Spain - Messi
6. 2005-2022 - Buenos Aires, Argentina - Messi
7. 2005-2023 - Estadio Monumental, Buenos Aires, Argentina - Messi
8. 2022 - Lusail Stadium, Qatar - Messi
9. 2021 - Paris, France - Messi
10. 2021-2023 - Parc des Princes, Paris, France - Messi
11. 2023 - Miami, United States - Messi
12. 2023- - Inter Miami Stadium, Fort Lauderdale, United States - Messi
13. 1985 - Funchal, Madeira, Portugal - Ronaldo
14. 1997-2003 - Sporting CP, Lisbon, Portugal - Ronaldo
15. 2003-2009 / 2021-2022 - Old Trafford, Manchester, United Kingdom - Ronaldo
16. 2009-2018 - Santiago Bernabeu, Madrid, Spain - Ronaldo
17. 2018-2021 - Allianz Stadium, Turin, Italy - Ronaldo
18. 2023- - Al Nassr, Riyadh, Saudi Arabia - Ronaldo

## データ出典と注意書き

- 背景地図と建物データは OpenFreeMap が配信する OpenStreetMap / OpenMapTiles 系データを利用しています。
- 地点座標は各都市・クラブ施設・スタジアム周辺の代表点です。作品演出用のため、出生家や練習場入口などの厳密な一点を示すものではありません。
- Inter Miami の本拠地周辺は、旧 DRV PNK Stadium として知られた Fort Lauderdale のスタジアムエリアを指しています。
- 人物・クラブ名は説明目的で使用しています。
