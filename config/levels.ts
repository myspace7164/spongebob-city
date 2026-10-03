import type { CityLevel } from "../src/interfaces";
import { cityConfig } from "./city";

/** User-supplied story; all layouts and thresholds are fictional until maps arrive. */
const placeholderLayout = Array.from(
  { length: cityConfig.plotCount },
  (_, id) => ({
    x: ((id % 4) - 1.5) * cityConfig.plotSpacing,
    z: -5 - Math.floor(id / 4) * cityConfig.plotSpacing,
  }),
);
export const campaignConfig = {
  entranceSurfaceLimit: 20,
  roofReleaseRate: 8,
  overflowRate: 60,
  basinInfiltrationRate: 90,
  basinDrainRate: 75,
  shadeNeighbourDistance: cityConfig.plotSpacing * 1.05,
};
export const arrivalStory = {
  title: "Ankunft – Ein Schwamm am falschen Ort?",
  paragraphs: [
    "Mit einem gelben Rheinschwimmsack treibt SpongeBob unter der Mittleren Brücke hindurch. Eigentlich wollte er nur herausfinden, ob es in Basel gute Burger gibt. Doch als er am Kleinbasler Rheinufer an Land klettert, werden seine Füsse heiss.",
    "„Autsch! Wer hat denn die ganze Stadt auf eine Herdplatte gestellt?“",
    "Auf dem Asphalt flimmert die Luft. Menschen suchen Schatten, junge Bäume lassen ihre Blätter hängen. Dann ziehen dunkle Wolken auf. Ein kurzer, heftiger Regenschauer verwandelt die Strasse in einen Bach. Wasser rauscht über den harten Boden, während die Erde unter den Bäumen trocken bleibt.",
    "Eine Mitarbeiterin der Stadtgärtnerei hebt eine umgekippte Pflanze auf. „Mal fehlt uns das Wasser. Dann kommt zu viel auf einmal – und fliesst genau dorthin, wo wir es nicht brauchen.“",
    "SpongeBob schaut auf seine Hände. „Wasser aufnehmen und wieder abgeben? Dafür bin ich gebaut!“",
    "Sie reicht ihm eine Karte von Basel. Darauf sind vier Quartiere markiert.",
  ],
};
export const endingStory = {
  title: "Die Stadt wird zum Schwamm",
  paragraphs: [
    "Nach dem Gewitter geht SpongeBob seine Route noch einmal ab.",
    "Am Riehenring versickert Wasser zwischen den Parkflächen. Auf der Erlenmatt stehen Pflanzen in feuchter Erde. Im St. Johann sitzen Menschen im Schatten. Auf VoltaNord bleibt Regenwasser für die nächste Trockenphase gespeichert.",
    "Die Sonne kommt wieder heraus. Basel wird warm – doch die verbesserten Orte bieten jetzt Schutz.",
    "„Wir werden weitere heisse Tage und starke Regenfälle erleben“, sagt die Gärtnerin. „Aber wir haben dem Wasser mehr Platz gegeben.“",
    "SpongeBob betrachtet seine inzwischen wieder trockenen Hände. „Ich dachte, Basel braucht einen riesigen Schwamm.“",
    "Er schaut über die Stadt und lächelt. „Dabei braucht es ganz viele kleine.“",
    "Auf der Karte leuchten die verbundenen Dächer, Bäume, Mulden und Speicher auf. Ein neuer Regentropfen fällt. Diesmal landet er direkt in einer Pflanzfläche.",
    "Basel wird Schwammstadt – Fläche für Fläche.",
  ],
};
export const cityLevels: readonly CityLevel[] = [
  {
    id: "riehenring",
    location: "Riehenring",
    title: "Der Boden muss wieder atmen",
    layout: placeholderLayout,
    entranceIds: [15],
    weather: { dryDuration: 25, rainDuration: 25, rainRate: 8 },
    story: [
      "Am Riehenring trifft SpongeBob auf eine Reihe versiegelter Parkflächen. Der erste Regen hat Pfützen hinterlassen. Gleich daneben stehen Bäume in kleinen, trockenen Baumrabatten.",
      "SpongeBob saugt eine Pfütze auf und drückt das Wasser über dem Asphalt wieder aus. Sofort läuft es zurück. „Okay. Das war jetzt einfach dieselbe Pfütze mit einem Umweg.“",
      "Die Gärtnerin zeigt auf den Boden. „Du brauchst zuerst einen Ort, der das Wasser aufnehmen kann.“",
      "SpongeBob knackt den Asphalt auf ausgewählten Flächen. Darunter kommt Erde zum Vorschein. Er legt durchlässige Beläge und kleine Mulden an, saugt Wasser vor einem Hauseingang auf und bringt es zu den offenen Baumflächen.",
      "Zum ersten Mal verschwindet eine Pfütze im Boden. Ein Blatt richtet sich auf.",
      "Doch auf seiner Karte blinkt bereits das nächste Quartier: Die Hitze steigt, und eine grössere Regenfront nähert sich.",
    ],
    objective:
      "Asphalt entsiegeln, Wasser aufsaugen und gezielt in offene Böden und Mulden verteilen. Hauseingänge müssen trocken bleiben.",
    goals: [
      { metric: "permeable", target: 4, label: "Flächen entsiegeln" },
      { metric: "basins", target: 2, label: "Pflanzmulden schaffen" },
      { metric: "reused", target: 400, label: "Liter gezielt verteilen" },
      { metric: "entrancesDry", target: 1, label: "Hauseingang trocken" },
      { metric: "heat", target: 82, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Gewitter überstanden" },
    ],
  },
  {
    id: "erlenmatt",
    location: "Erlenmatt",
    title: "Basel braucht Wurzeln",
    layout: placeholderLayout,
    entranceIds: [15],
    weather: { dryDuration: 35, rainDuration: 30, rainRate: 12 },
    story: [
      "Auf der Erlenmatt entdeckt SpongeBob den Max Kämpf-Platz und die Grünanlage „Im Triangel“. Zwischen Kiesflächen und Bäumen fühlt sich die Stadt bereits anders an.",
      "„Hier können meine Füsse endlich wieder mit mir reden!“",
      "Aber im angrenzenden Spielgebiet fehlen Pflanzen. Die Sonne brennt stärker als zuvor. Wasser, das SpongeBob mühsam gesammelt hat, reicht nur für einen Teil der Fläche.",
      "Er möchte überall Bäume setzen. Die Gärtnerin hält ihn an. „Ein Baum braucht mehr als ein Loch. Seine Wurzeln brauchen Platz – und Wasser.“",
      "SpongeBob verbindet die entsiegelten Flächen mit Pflanzmulden. Er setzt Bäume an wichtige Wege und pflanzt robuste Gräser und Stauden dazwischen. Das gesammelte Regenwasser verteilt er zuerst an die durstigsten Pflanzen.",
      "Als der nächste Schauer einsetzt, halten die bepflanzten Flächen mehr Wasser zurück. Trotzdem laufen die ungeschützten Wege schneller voll als zuvor.",
      "SpongeBob blickt nach oben. Von den Dächern schiessen neue Wassermassen herunter. „Wir haben den Boden verbessert. Aber die Stadt hat ja noch ein ganzes Stockwerk darüber!“",
    ],
    objective:
      "Bäume und Pflanzen passend platzieren, Wurzelräume schaffen und die Bewässerung priorisieren. Bestehende Entsiegelungen weiter nutzen.",
    goals: [
      { metric: "permeable", target: 7, label: "Offene Wurzelräume" },
      { metric: "healthyTrees", target: 3, label: "Gesunde, bewässerte Bäume" },
      { metric: "basins", target: 2, label: "Pflanzmulden erhalten" },
      { metric: "reused", target: 800, label: "Liter gezielt verteilen" },
      { metric: "heat", target: 65, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Gewitter überstanden" },
    ],
  },
  {
    id: "st-johann",
    location: "St. Johann",
    title: "Schatten über den Strassen",
    layout: placeholderLayout,
    entranceIds: [15],
    weather: { dryDuration: 45, rainDuration: 35, rainRate: 16 },
    story: [
      "In einem dicht bebauten Spielgebiet im St. Johann beginnt der heisseste Tag bisher. Selbst zwischen zwei Regenschauern trocknet die Stadt rasch aus. Auf dem Platz finden die Menschen kaum einen kühlen Aufenthaltsort.",
      "SpongeBob steigt auf ein Flachdach. Von hier sieht er den Rhein, die Häuser und eine ganze Landschaft aus ungenutzten Dachflächen. „Basel! Du hast deinen Garten auf dem falschen Stockwerk vergessen!“",
      "Er baut begrünte Dächer, die einen Teil des Regens zurückhalten und verzögert abgeben. Unten gestaltet er eine Shade Plaza: ein schattiger Quartierplatz mit Bäumen, durchlässigem Boden und Sitzgelegenheiten. Neue Schattendächer helfen, bis die Baumkronen im Spiel gross genug sind.",
      "Menschen wechseln von der heissen Strasse auf den kühleren Platz. SpongeBob atmet auf.",
      "Dann prasselt der bisher stärkste Regen auf die Dächer. Ihre Speicher füllen sich. An den Abläufen beginnt Wasser überzulaufen.",
      "„Die Dächer helfen“, sagt die Gärtnerin. „Jetzt braucht das überschüssige Wasser einen sicheren nächsten Halt.“",
    ],
    objective:
      "Green Roofs bauen, eine zusammenhängende Schattenzone schaffen und Dachabläufe zu geeigneten Aufnahmeflächen führen.",
    goals: [
      { metric: "roofs", target: 2, label: "Green Roofs bauen" },
      {
        metric: "shadeConnected",
        target: 2,
        label: "Benachbarte Shade Plazas",
      },
      {
        metric: "roofRoutes",
        target: 2,
        label: "Dachabläufe verbinden (C → C)",
      },
      { metric: "healthyTrees", target: 3, label: "Gesunde Bäume erhalten" },
      { metric: "reused", target: 1000, label: "Liter gezielt verteilen" },
      { metric: "heat", target: 48, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      { metric: "stormCompleted", target: 1, label: "Gewitter überstanden" },
    ],
  },
  {
    id: "voltanord",
    location: "VoltaNord · Lysbüchelplatz",
    title: "Platz für den grossen Regen",
    layout: placeholderLayout,
    entranceIds: [15],
    weather: { dryDuration: 55, rainDuration: 45, rainRate: 20 },
    story: [
      "Auf VoltaNord erreicht SpongeBob das letzte Baugebiet am Lysbüchelplatz. Hier sollen Wohnen, Arbeiten und ein grüner Quartierplatz zusammenkommen.",
      "Doch die Wetterkarte wird dunkelrot: die längste Hitzephase und danach das stärkste Gewitter des Spiels.",
      "SpongeBob baut Rain Tanks, die Regenwasser für trockene Zeiten speichern. Dazu legt er Ponds und bepflanzte Rückhaltemulden an. Er verbindet Dächer, offene Böden und Speicher zu einem Netz.",
      "Dann bricht das Gewitter los. Ein Tank ist voll. Eine Mulde staut sich. Wasser nähert sich dem Eingang der Schule. SpongeBob setzt zum Aufsaugen an – doch auch er ist bald vollständig durchnässt.",
      "„Ich kann nicht die ganze Stadt in meinem Bauch speichern!“",
      "Er öffnet den vorbereiteten Überlauf zu einer freien Rückhaltefläche. Gleichzeitig verteilt er Wasser aus einem anderen Speicher an trockene Pflanzbereiche. Schritt für Schritt findet das Wasser sichere Wege.",
      "Als der Regen endet, bleiben die Hauseingänge frei. In den Tanks liegt bereits der Vorrat für den nächsten heissen Tag.",
    ],
    objective:
      "Speicher und Teiche bauen, Zuflüsse verbinden und sichere Überläufe einplanen. Alle bisherigen Massnahmen müssen zusammenarbeiten.",
    goals: [
      { metric: "tanks", target: 2, label: "Rain Tanks bauen" },
      { metric: "ponds", target: 1, label: "Pond bauen" },
      { metric: "basins", target: 2, label: "Pflanzmulden erhalten" },
      {
        metric: "tankRoutes",
        target: 2,
        label: "Sichere Tanküberläufe (C → C)",
      },
      { metric: "roofRoutes", target: 2, label: "Dachzuflüsse erhalten" },
      { metric: "shadeConnected", target: 2, label: "Schattenzone erhalten" },
      { metric: "healthyTrees", target: 3, label: "Gesunde Bäume erhalten" },
      { metric: "retained", target: 2000, label: "Liter Vorrat zurückhalten" },
      { metric: "reused", target: 1500, label: "Liter gezielt verteilen" },
      { metric: "entrancesDry", target: 1, label: "Schuleingang trocken" },
      { metric: "heat", target: 48, label: "Hitze höchstens", maximum: true },
      {
        metric: "flood",
        target: 28,
        label: "Flutgefahr höchstens",
        maximum: true,
      },
      {
        metric: "stormCompleted",
        target: 1,
        label: "Stärkstes Gewitter überstanden",
      },
    ],
  },
];
