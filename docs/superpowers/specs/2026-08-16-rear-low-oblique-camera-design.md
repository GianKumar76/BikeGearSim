# Antrieb aus schräger Heck-Untersicht

## Ziel

Die Antriebsansicht erhält eine klar erkennbare dreidimensionale Perspektive aus schräger Heck-Untersicht rechts. Die Kassette liegt links-hinten, die Kurbel rechts-vorn. Kette, Rahmen, Ritzel, Kettenblätter und Schaltwerk müssen sichtbar in dieselbe Tiefe projiziert werden.

## Kameramodell

Die bestehende Weltprojektion bleibt die zentrale Geometrieschicht, erhält jedoch einen wesentlich ausgeprägteren obliquen Kamerawinkel:

- Die Längsachse vom Hinterrad zur Kurbel projiziert deutlich nach rechts und oben, wird aber gegenüber der bisherigen Seitenansicht verkürzt.
- Die vertikale Rahmenachse projiziert nach links und oben, statt ausschließlich senkrecht zu bleiben.
- Die Achsentiefe von Kassette und Kettenblättern projiziert weit nach rechts und unten.
- Die Ellipsenrotation folgt dem projizierten Längsvektor; der kleine Ellipsenradius wird stärker verkürzt. Ritzel und Kettenblätter wirken dadurch als schräg liegende Scheiben.

## Geometrie und Lesbarkeit

- Alle Anker bleiben Weltpunkte und verwenden ausschließlich `projectPoint` mit derselben Kamera.
- Die Kassette wird von der hintersten großen zur vordersten kleinen Scheibe entlang der Achsentiefe gezeichnet. Ihr Versatz muss klar sichtbar sein, ohne die Ritzelkonturen zu verdecken.
- Die beiden Kettenblätter behalten getrennte Achsenkoordinaten. Das 34T-Blatt bleibt als eigenständige, nicht aktive Scheibe mit Außenkontur und Label sichtbar, wenn das 50T-Blatt aktiv ist.
- Kettenstränge und Kettenbögen berühren die neuen gedrehten Ellipsen tangential. Die beiden Schaltwerkröllchen folgen derselben Orientierung.
- Die Rahmenrohre verbinden projizierte Weltpunkte und dürfen keine alten Bildschirmkoordinaten verwenden.

## Rendering

Die Canvas-Zeichnung übergibt den einheitlichen Ellipsenwinkel an Ritzel, Kettenblätter, Kettenbögen, Kurbelarm und Schaltwerkröllchen. Die sichtbaren vorderen und hinteren Kanten jeder Scheibe werden entlang der projizierten Achsentiefe extrudiert. HUD und Schaltlogik bleiben unverändert.

## Verifikation

Automatisierte Tests prüfen:

- einen deutlich negativen Neigungswinkel der projizierten Längsachse,
- unterschiedliche, nicht achsenparallele Projektionsrichtungen für Länge, Höhe und Tiefe,
- Ritzel- und Kettenblattstapel entlang derselben Tiefenachse,
- mindestens 30 Pixel Abstand zwischen 34T und 50T bei Skalierung 1,
- Tangentialpunkte auf den gedrehten Ellipsen und die Übergabe derselben Projektion an den Renderer.

Die visuelle Abnahme erfolgt mit 50×15, 34×30 und 50×11. Erwartet werden eine eindeutig räumliche Ansicht, gut unterscheidbare Ritzelstufen und beide vorderen Kettenblätter.
