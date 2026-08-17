# Fast frontale Antriebskamera

## Ziel

Die Antriebsansicht orientiert sich am Referenzfoto: eine fast frontale, leicht von rechts hinten versetzte Ansicht auf Kassette, Kette, Schaltwerk und Kurbel. Die obere Kette steigt nur leicht zur Kurbel an. Die Antriebsteile müssen räumlich gestaffelt, aber nicht dramatisch diagonal erscheinen.

## Kamera und Projektion

- Die Längsachse von Kassette zu Kurbel projiziert überwiegend nach rechts und nur leicht nach oben.
- Die Achsentiefe verschiebt Komponenten dezent nach rechts unten; sie darf die Zahnradflächen nicht stark verformen oder überdecken.
- Die Vertikale bleibt überwiegend nach unten, mit nur geringem seitlichem Anteil.
- Ritzel und Kettenblätter erhalten einen deutlich größeren kleinen Ellipsenradius als in der aktuellen Ansicht. Ihre Frontflächen wirken nahezu rund und zeigen die Zähne, Öffnungen und Kurbelspinne gut erkennbar.

## Antriebskomponenten

- Die Kassette bleibt links und staffelt ihre einzelnen Ritzel leicht nach hinten, analog zum sichtbaren Ritzelstapel im Referenzbild.
- Das 34T- und das 50T-Kettenblatt sind rechts sichtbar getrennt. Der nicht aktive Ring bleibt mit Außenkontur und Label erkennbar.
- Der obere Kettenstrang führt fast waagerecht mit leichtem Anstieg zur Kurbel.
- Die Kette kehrt über ein sichtbar unter der Kassette hängendes Schaltwerk zurück. Führungs- und Spannrolle folgen weiterhin der gemeinsamen Kamera.
- Rahmenstreben bleiben dezent im Hintergrund und überlagern den Kettenlauf nicht.

## Grenzen

- Schaltlogik, Presets, HUD und Bedienung bleiben unverändert.
- Alle Punkte verwenden weiterhin `projectPoint` mit einer Kamera; es werden keine komponentenspezifischen Bildschirmanker eingeführt.
- Kettentangenten müssen die neuen, fast runden Ellipsen weiterhin exakt berühren.

## Verifikation

Tests prüfen eine nur leicht negative Neigung der Längsachse, eine überwiegend vertikale Höhenachse, eine dezente Tiefenachse, die getrennten Kettenblattzentren und Tangentialpunkte auf den Ellipsen. Die visuelle Prüfung bei 50×15 verifiziert den fotoähnlichen, fast frontalen Kettenlauf und die klare Sicht auf Kassette, Kettenblätter und Schaltwerk.
