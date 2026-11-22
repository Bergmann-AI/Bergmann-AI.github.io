# Werkstatt: die besten Formulierungen finden

Agenturen finden starke Sätze nicht durch Eingebung. Sie schreiben viele Varianten aus verschiedenen Blickwinkeln, bewerten sie nach festen Kriterien und testen die besten. Diese Datei beschreibt dieses Vorgehen für H1, Unterzeilen, Abschnittsüberschriften, Buttons, Meta-Texte und Kernsätze.

Wann einsetzen: für jede H1, jede Hero-Unterzeile, jeden Haupt-Button, und für jeden Satz, bei dem man merkt „das geht besser“. Für Fließtext reichen die sieben Durchgänge aus SKILL.md.

Inhalt: 1. Rohstoff · 2. Blickwinkel · 3. Masse vor Klasse · 4. Bewertungsraster · 5. Vorsortieren mit dem Skript · 6. Schärfen · 7. Prüfen mit Menschen · 8. Testen mit echten Besuchern · 9. Ablageform

---

## 1. Rohstoff

Gute Varianten entstehen aus gutem Material. Vor dem Schreiben bereitlegen:

- **Kundenwörter:** wörtliche Sätze aus Bewertungen, Mails, Chatverläufen (`briefing.md` 3). Die häufigsten Wörter markieren.
- **Fakten:** Faktenliste mit Zahlen, Zeiten, Orten, Namen.
- **Nutzen-Leiter:** je Merkmal Vorteil, Nutzen, Gefühl (`formeln.md` 3).
- **Einwände:** die fünf wichtigsten aus der Einwand-Karte (`umstimmen.md` 2).
- **Standard-Sätze der Konkurrenz:** was alle sagen, also nicht in Frage kommt (`briefing.md` 4).

Ohne Kundenwörter und Fakten entstehen nur Floskeln. Dann erst Material holen, nicht schreiben.

---

## 2. Blickwinkel

Für dieselbe Botschaft gibt es viele Zugänge. Jeder Winkel liefert andere Wörter. Für eine H1 oder Unterzeile aus mindestens fünf Winkeln je eine Variante schreiben.

| Winkel | Frage | Beispiel (erfundener Elektrobetrieb) |
|---|---|---|
| Kategorie + Ort | Was ist es, wo? | „Elektriker in Werther und Halle (Westf.)“ |
| Kategorie + Zielgruppe | Was ist es, für wen? | „Elektrik für Altbauten und Vermieter“ |
| Ergebnis | Was hat der Kunde danach? | „Neue Elektrik, ohne dass die Wohnung zur Baustelle wird“ |
| Problem | Welche Lage löst es? | „Sicherung fliegt raus? Wir finden den Fehler.“ |
| Zahl | Welche harte Tatsache unterscheidet? | „E-Check für Wohnungen: 129 €“ |
| Zeit | Wie schnell, wann? | „Rückruf am selben Werktag“ |
| Kontrast | Was ist anders als gewohnt? | „Der Preis steht fest, bevor wir anfangen“ |
| Einwand | Welche Sorge wird beantwortet? | „Neue Leitungen, ohne alle Wände aufzustemmen“ (nur wenn das Verfahren so ist) |
| Szene | Welcher Moment aus dem Alltag? | „Wallbox in der Garage, Auto morgens voll“ |
| Person | Wer steht dahinter? | „Tobias Beispiel, Elektromeister in Werther“ |
| Neugier (nur Ratgeber) | Welche Frage weckt es? | „Was ein E-Check findet, das Sie nicht sehen“ |
| Kundenwort | Wie sagen Kunden es? | „Endlich ein Elektriker, der zurückruft“ (nur als echte Stimme) |

Für Buttons: Varianten aus Verb (anfordern, buchen, vereinbaren, ansehen) mal Objekt (Rückruf, Angebot, Termin, Preise). Für Meta-Descriptions: je eine Variante mit Preis, mit Zeit, mit Beleg.

---

## 3. Masse vor Klasse

- **H1 und Hero-Unterzeile:** 10 bis 20 Varianten. Die ersten fünf sind meist die naheliegenden. Die guten kommen danach.
- **Abschnittsüberschriften:** 3 bis 5 je Überschrift.
- **Haupt-Button:** 5 bis 8.
- **Wichtige Einzelsätze** (Preis-Erklärung, Risiko-Satz, Abschluss): 3 bis 5.

Beim Schreiben nicht bewerten. Erst sammeln, dann sortieren. Streichen erst im nächsten Schritt.

---

## 4. Bewertungsraster

Jede Variante bekommt in sechs Kriterien 0, 1 oder 2 Punkte. Höchstwert 12.

| Kriterium | 0 Punkte | 1 Punkt | 2 Punkte |
|---|---|---|---|
| **Klar** | Fremder versteht nicht, was angeboten wird | versteht mit Nachdenken | versteht in fünf Sekunden |
| **Konkret** | nur Adjektive | ein konkretes Element | Zahl, Ort, Zeit oder Name, die es greifbar machen |
| **Belegt** | Behauptung ohne Quelle | teilweise belegt | jedes Element in der Faktenliste |
| **Relevant** | spricht über den Anbieter | Nutzen angedeutet | Ergebnis oder Problem des Kunden im Mittelpunkt |
| **Eigen** | könnte jeder Wettbewerber schreiben | etwas eigen | stimmt nur für diesen Anbieter |
| **Sprache** | Fachwort, Floskel oder KI-Klang | neutral | Kundenwort, laut gesprochen natürlich |

Auswertung:
- **10 bis 12:** Kandidat. Die besten zwei bis drei kommen in die Endrunde.
- **7 bis 9:** schärfen (Abschnitt 6), dann neu bewerten.
- **unter 7:** verwerfen.
- **Belegt = 0** schließt eine Variante immer aus, egal wie gut sie klingt.

Bei Gleichstand gewinnt die klarere Variante. Klarheit kommt vor Kreativität.

---

## 5. Vorsortieren mit dem Skript

Das Prüfskript bewertet Varianten mechanisch vor: Länge, Floskeln, KI-Klang, Weichmacher, Druck-Wörter, Superlative, Zahlen und Fakten, Kundenansprache, Lesbarkeit.

```
python3 <skill>/scripts/texte_pruefen.py --varianten varianten.txt --art h1
```

- `varianten.txt`: eine Variante pro Zeile. Leerzeilen und Zeilen mit `#` werden übersprungen.
- `--art`: `h1`, `h2`, `button`, `unterzeile`, `title`, `meta` oder `satz`. Bestimmt die passende Länge.
- Ausgabe: Rangliste mit Punktzahl, Gründen und Hinweisen.

Das Skript misst Form, nicht Wahrheit und nicht Wirkung. Es sortiert offensichtliche Schwächen aus. Das Urteil nach dem Raster in Abschnitt 4 bleibt Kopfarbeit.

---

## 6. Schärfen

Für Varianten mit 7 bis 9 Punkten, und für die Endrunde:

1. **Streichen:** Jedes Wort entfernen, ohne das die Aussage gleich bleibt. Füllwörter, doppelte Adjektive, „wir bieten“.
2. **Tauschen:** Abstraktes Wort gegen konkretes (`wortschatz.md` 3), schwaches Verb gegen starkes (`wortschatz.md` 1), Fachwort gegen Kundenwort.
3. **Umstellen:** Das wichtigste Wort nach vorn, besonders bei Title, Buttons und Listenpunkten.
4. **Teilen:** Zwei Gedanken in zwei Sätze.
5. **Laut lesen:** Stolpert die Zunge, stolpert das Auge.
6. **Gegenprobe** (`floskeln.md` 7): Konkurrenz-Test, Vorlese-Test, Beleg-Test.

Beispiel:
- Rohform: „Wir bieten Ihnen professionelle Elektroarbeiten zu fairen Preisen.“ (Raster: 4)
- Gestrichen: „Elektroarbeiten zu fairen Preisen.“
- Getauscht: „Elektroarbeiten zum Festpreis.“
- Konkret: „E-Check 129 €, Wallbox ab 1.290 €, Preise vorab.“ (Raster: 11, wenn belegt)

---

## 7. Prüfen mit Menschen

Ohne Werkzeuge, mit drei bis fünf Personen, die die Zielgruppe gut treffen (nicht das eigene Team):

- **Fünf-Sekunden-Test:** Seite oder Entwurf fünf Sekunden zeigen, dann wegnehmen. Fragen: „Was wird hier angeboten? Für wen? Was würden Sie als Nächstes tun?“ Stimmen die Antworten nicht, ist der Hero unklar.
- **Laut-Denken:** Person liest die Seite und sagt, was sie denkt. Notieren, wo sie stockt, zweifelt oder sucht.
- **Markieren:** Person markiert grün, was überzeugt, rot, was stört oder unklar ist.
- **Nacherzählen:** Nach dem Lesen in einem Satz sagen lassen, was der Betrieb anbietet und warum man ihn wählen sollte. Das ist der Test für die Kernbotschaft.
- **Varianten-Vergleich:** Zwei bis drei H1-Varianten nebeneinander zeigen: „Bei welcher würden Sie eher anrufen? Warum?“ Das Warum ist wichtiger als die Wahl.

Fünf Personen finden die meisten Verständnisprobleme. Für eine verlässliche Entscheidung zwischen ähnlich guten Varianten reicht das nicht. Dafür gibt es Abschnitt 8.

---

## 8. Testen mit echten Besuchern

**A/B-Test** (zwei Fassungen gleichzeitig, Besucher zufällig verteilt) lohnt sich nur bei genug Verkehr. Für ein belastbares Ergebnis braucht man je Fassung meist mehrere hundert Abschlüsse (Anfragen, Käufe). Kleine Seiten erreichen das selten in vertretbarer Zeit.

**Für kleine Seiten stattdessen:**
- **Vorher/Nachher vergleichen:** Neue Fassung einführen und Anfragen, Klickrate auf den Haupt-Button und Formular-Abbrüche über vier bis acht Wochen mit dem gleichen Zeitraum davor vergleichen. Saison und Werbung berücksichtigen.
- **Umfrage auf der Seite:** eine Frage, z. B. „Was hält Sie gerade davon ab, uns anzufragen?“ oder auf der Danke-Seite „Was hat Sie überzeugt?“. Die Antworten sind Kundenwörter für die nächste Fassung.
- **Anzeigen als Testlabor:** Zwei Anzeigentexte mit verschiedenen Botschaften schalten. Die Klickraten zeigen, welche Botschaft zieht, oft schon nach wenigen hundert Klicks.
- **Fragen im Alltag:** Werden am Telefon noch Dinge gefragt, die auf der Seite stehen? Dann stehen sie an der falschen Stelle oder in den falschen Worten.

Was testen: zuerst die großen Hebel (Botschaft der H1, Angebot, Haupt-Aktion, Preisdarstellung), nicht einzelne Wörter oder Farben.

---

## 9. Ablageform

Im Textplan unter dem Feld die Endrunde festhalten, damit die Entscheidung nachvollziehbar bleibt:

```
H1: Elektriker in Werther und Halle (Westf.)
Notiz: Varianten 14, Endrunde: „Elektriker in Werther und Halle (Westf.)“ (12) · „Elektrik mit Preis vorab, in Werther“ (10) · „Sicherung fliegt raus? Wir finden den Fehler.“ (9, Frage als H1 vermieden). Gewählt wegen Klarheit und Suchbegriff.
```

Die Felder „Notiz:“ prüft das Skript nicht. Abgelehnte Varianten mit guter Idee können als Abschnittsüberschrift oder in der Meta-Description weiterleben.
