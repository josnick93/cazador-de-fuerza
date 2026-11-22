/**
 * Fichas de técnica en español. Las fotos vienen de free-exercise-db (dominio público, Unlicense)
 * y se sirven desde `public/exercises/<id>/{0,1}.webp`; `source` es el id original en ese dataset.
 * Sin `source` no hay fotos.
 */
export const GUIDE_IMAGES_CREDIT = {
  name: "free-exercise-db",
  url: "https://github.com/yuhonas/free-exercise-db",
  license: "dominio público",
};

export interface GuideContent {
  source?: string;
  summary: string;
  steps: string[];
  tips: string[];
  mistakes: string[];
}

export const EXERCISE_GUIDES: Record<string, GuideContent> = {
  // ── Sentadilla ──
  "ex-sentadilla": {
    source: "Barbell_Squat",
    summary:
      "El básico de pierna: cuádriceps, glúteo y aductores con la barra sobre los trapecios.",
    steps: [
      "Barra apoyada en los trapecios, manos algo más abiertas que los hombros y codos hacia abajo.",
      "Pies a la anchura de los hombros, puntas ligeramente hacia fuera.",
      "Coge aire, aprieta el abdomen y baja sentándote entre los talones hasta romper el paralelo.",
      "Sube empujando el suelo con todo el pie, sin perder la espalda neutra.",
    ],
    tips: [
      "Las rodillas siguen la dirección de las puntas: pueden pasar de los dedos.",
      "Mantén el aire hasta pasar el punto más difícil de la subida.",
    ],
    mistakes: [
      "Rodillas que se meten hacia dentro al subir.",
      "Levantar los talones o redondear la zona lumbar abajo.",
    ],
  },
  "ex-sentadilla-frontal": {
    source: "Front_Barbell_Squat",
    summary: "Sentadilla con la barra delante: más cuádriceps y torso más vertical.",
    steps: [
      "Barra sobre los deltoides delanteros, codos altos y apuntando al frente.",
      "Pies a la anchura de los hombros.",
      "Baja recto, con el pecho alto, hasta donde mantengas los codos arriba.",
      "Sube llevando los codos hacia delante y arriba.",
    ],
    tips: [
      "Si te cuesta el agarre olímpico, cruza los brazos o usa correas en la barra.",
      "Unas zapatillas con tacón ayudan a bajar más.",
    ],
    mistakes: ["Dejar caer los codos: la barra rueda hacia delante.", "Bajar con prisa y rebotar."],
  },
  "ex-sentadilla-goblet": {
    source: "Goblet_Squat",
    summary:
      "Sentadilla con una mancuerna pegada al pecho. Ideal para técnica y para pierna en casa.",
    steps: [
      "Sujeta una mancuerna en vertical por un extremo, pegada al esternón.",
      "Pies algo más abiertos que los hombros.",
      "Baja entre las piernas con el torso erguido, codos por dentro de las rodillas.",
      "Sube apretando glúteos sin separar la mancuerna del cuerpo.",
    ],
    tips: [
      "Usa los codos para abrir las rodillas abajo.",
      "Pausa 1 s abajo si la carga se queda corta.",
    ],
    mistakes: ["Inclinar el tronco hacia delante.", "Alejar la mancuerna del pecho."],
  },
  "ex-sentadilla-bulgara": {
    source: "One_Leg_Barbell_Squat",
    summary:
      "Sentadilla a una pierna con el pie de atrás en un banco. Mucho glúteo y cuádriceps con poca carga.",
    steps: [
      "Coloca el empeine del pie trasero sobre un banco o silla.",
      "El pie delantero, lo bastante adelantado para bajar con la rodilla sobre el pie.",
      "Baja en vertical hasta que la rodilla de atrás casi toque el suelo.",
      "Sube empujando con el talón delantero. Completa las reps y cambia de pierna.",
    ],
    tips: [
      "Lastra con mancuernas, una mochila o una garrafa.",
      "Torso algo inclinado: más glúteo. Recto: más cuádriceps.",
    ],
    mistakes: ["Empujar con la pierna de atrás.", "Pie delantero demasiado cerca del banco."],
  },
  "ex-sentadilla-hack": {
    source: "Hack_Squat",
    summary:
      "Sentadilla guiada en máquina inclinada. Cuádriceps a tope sin cargar tanto la espalda.",
    steps: [
      "Espalda contra el respaldo y hombros bajo las almohadillas.",
      "Pies a la anchura de los hombros en mitad de la plataforma.",
      "Quita los seguros y baja controlando hasta 90° o más.",
      "Empuja la plataforma sin bloquear del todo las rodillas arriba.",
    ],
    tips: ["Pies más bajos: más cuádriceps. Más altos: más glúteo.", "Baja en 2-3 segundos."],
    mistakes: [
      "Despegar la espalda o la cadera del respaldo.",
      "Recorrido corto para meter más peso.",
    ],
  },
  "ex-sentadilla-smith": {
    source: "Smith_Machine_Squat",
    summary:
      "Sentadilla en barra guiada. Más estable que la libre: buena opción si el rack está ocupado.",
    steps: [
      "Colócate bajo la barra con ella en los trapecios.",
      "Pies ligeramente adelantados respecto a la barra.",
      "Desbloquea girando la barra y baja hasta el paralelo o más.",
      "Sube empujando con todo el pie y vuelve a bloquear al terminar.",
    ],
    tips: [
      "Ajusta los topes de seguridad antes de empezar.",
      "Cuanto más adelantes los pies, más glúteo.",
    ],
    mistakes: ["Pies justo debajo de la barra: carga de más las rodillas.", "Rebotar abajo."],
  },

  // ── Bisagra ──
  "ex-peso-muerto": {
    source: "Barbell_Deadlift",
    summary: "Levantar la barra del suelo: cadena posterior completa (glúteo, isquios, espalda).",
    steps: [
      "Pies a la anchura de la cadera, barra sobre la mitad del pie.",
      "Agarra la barra justo por fuera de las piernas, espinillas tocándola.",
      "Pecho arriba, espalda neutra y dorsales apretados: tira de la holgura de la barra.",
      "Empuja el suelo y extiende cadera y rodillas a la vez, con la barra rozando las piernas.",
    ],
    tips: [
      "Imagina que alejas el suelo con los pies, no que tiras con la espalda.",
      "Resetea en cada repetición.",
    ],
    mistakes: ["Redondear la espalda baja.", "Subir primero la cadera y luego la barra."],
  },
  "ex-peso-muerto-rumano": {
    source: "Romanian_Deadlift",
    summary: "Bisagra desde arriba con rodillas casi fijas. Isquiotibiales y glúteo.",
    steps: [
      "De pie con la barra en las manos, rodillas ligeramente flexionadas.",
      "Lleva la cadera hacia atrás deslizando la barra por los muslos.",
      "Baja hasta notar estiramiento en los isquios, normalmente por debajo de la rodilla.",
      "Vuelve empujando la cadera hacia delante y aprieta glúteos arriba.",
    ],
    tips: [
      "La barra nunca se separa de las piernas.",
      "Usa correas si el agarre falla antes que las piernas.",
    ],
    mistakes: [
      "Doblar las rodillas como en una sentadilla.",
      "Bajar redondeando la espalda para llegar más abajo.",
    ],
  },
  "ex-rumano-mancuernas": {
    source: "Stiff-Legged_Dumbbell_Deadlift",
    summary: "Peso muerto rumano con mancuernas: misma bisagra, más fácil de montar.",
    steps: [
      "Una mancuerna en cada mano delante de los muslos.",
      "Rodillas suaves, cadera atrás y mancuernas cerca de las piernas.",
      "Baja hasta notar tensión en los isquios sin perder la espalda neutra.",
      "Sube apretando glúteos.",
    ],
    tips: [
      "Mira al suelo unos metros por delante para mantener el cuello neutro.",
      "Controla 2-3 s la bajada.",
    ],
    mistakes: [
      "Dejar que las mancuernas se vayan hacia delante.",
      "Hiperextender la espalda arriba.",
    ],
  },
  "ex-puente-gluteo": {
    source: "Single_Leg_Glute_Bridge",
    summary: "Puente de glúteo a una pierna. Glúteo e isquios sin material.",
    steps: [
      "Tumbado boca arriba, una rodilla flexionada y la otra pierna estirada.",
      "Lastre opcional (mochila o disco) sobre la cadera.",
      "Empuja con el talón apoyado y sube la cadera hasta alinear rodilla, cadera y hombro.",
      "Aguanta 1 s arriba y baja controlando.",
    ],
    tips: [
      "Apoya la espalda alta en un sofá para más recorrido (hip thrust).",
      "Aprieta el glúteo, no arquees la espalda.",
    ],
    mistakes: ["Subir arqueando la zona lumbar.", "Que la cadera se incline hacia un lado."],
  },
  "ex-hip-thrust": {
    source: "Barbell_Hip_Thrust",
    summary: "Extensión de cadera con barra y la espalda apoyada en un banco. El rey del glúteo.",
    steps: [
      "Espalda alta apoyada en el banco y barra sobre la cadera (con almohadilla).",
      "Pies apoyados a la anchura de la cadera, rodillas a 90° arriba.",
      "Empuja con los talones hasta que el tronco quede paralelo al suelo.",
      "Aprieta glúteos 1 s y baja controlando.",
    ],
    tips: [
      "Barbilla hacia el pecho: evita arquear la espalda.",
      "Si no hay barra libre, sirve la máquina de hip thrust o el multipower.",
    ],
    mistakes: [
      "Hiperextender la zona lumbar arriba.",
      "Pies demasiado lejos: trabajan los isquios.",
    ],
  },

  // ── Empuje horizontal ──
  "ex-banca-barra": {
    source: "Barbell_Bench_Press_-_Medium_Grip",
    summary: "El básico de empuje: pecho, hombro delantero y tríceps.",
    steps: [
      "Tumbado con los ojos bajo la barra, escápulas juntas y hacia abajo.",
      "Agarre algo más abierto que los hombros, pies firmes en el suelo.",
      "Baja la barra controlada a la parte baja del pecho, codos a unos 45°.",
      "Empuja hacia arriba y ligeramente hacia atrás hasta extender los brazos.",
    ],
    tips: [
      "Usa un compañero o topes de seguridad en series duras.",
      "Un ligero arco lumbar es normal; los glúteos siempre en el banco.",
    ],
    mistakes: ["Rebotar la barra en el pecho.", "Abrir los codos a 90°: castiga los hombros."],
  },
  "ex-press-inclinado": {
    source: "Barbell_Incline_Bench_Press_-_Medium_Grip",
    summary: "Press en banco inclinado (30-45°). Más pecho superior y hombro.",
    steps: [
      "Banco a 30-45°, escápulas atrás y abajo.",
      "Agarre algo más abierto que los hombros.",
      "Baja la barra a la parte alta del pecho.",
      "Empuja en vertical hasta extender.",
    ],
    tips: [
      "30° basta: más inclinación lo convierte en press de hombro.",
      "Mantén los pies firmes para no deslizarte.",
    ],
    mistakes: ["Despegar los glúteos del banco.", "Bajar la barra al cuello."],
  },
  "ex-banca-mancuernas": {
    source: "Dumbbell_Bench_Press",
    summary: "Press de pecho con mancuernas: más recorrido y cada brazo trabaja por su cuenta.",
    steps: [
      "Siéntate con las mancuernas en los muslos y túmbate llevándolas al pecho.",
      "Escápulas juntas, mancuernas a la altura del pecho y codos a 45°.",
      "Empuja hasta arriba juntando un poco las mancuernas.",
      "Baja controlando hasta notar estiramiento en el pecho.",
    ],
    tips: [
      "Para dejarlas, llévalas al pecho y siéntate con ellas sobre los muslos.",
      "Si dudas entre dos pesos, coge el ligero con más control.",
    ],
    mistakes: ["Chocar las mancuernas arriba.", "Bajar poco por usar demasiado peso."],
  },
  "ex-flexiones-lastradas": {
    source: "Pushups",
    summary: "Flexiones con lastre (mochila o disco en la espalda). Pecho y tríceps sin máquinas.",
    steps: [
      "Manos algo más abiertas que los hombros y el cuerpo recto de cabeza a talones.",
      "Lastre bien sujeto sobre la parte alta de la espalda.",
      "Baja hasta que el pecho casi toque el suelo, codos a 45°.",
      "Empuja el suelo hasta extender los brazos.",
    ],
    tips: [
      "Aprieta glúteo y abdomen: el cuerpo es una tabla.",
      "Con los pies elevados cargas más el pecho alto.",
    ],
    mistakes: ["Cadera caída o en pico.", "Recorrido a medias."],
  },
  "ex-press-maquina": {
    source: "Leverage_Chest_Press",
    summary: "Press de pecho guiado. Estable y seguro para apurar series sin compañero.",
    steps: [
      "Ajusta el asiento para que las asas queden a la altura del pecho medio.",
      "Espalda pegada al respaldo, escápulas atrás.",
      "Empuja hasta casi extender los codos.",
      "Vuelve controlando hasta notar estiramiento en el pecho.",
    ],
    tips: [
      "Es buena opción para series al fallo sin riesgo.",
      "Haz una pausa breve en el estiramiento.",
    ],
    mistakes: [
      "Asiento demasiado alto: trabaja más el hombro.",
      "Despegar la espalda para mover más peso.",
    ],
  },
  "ex-press-smith": {
    source: "Smith_Machine_Bench_Press",
    summary:
      "Press banca en multipower. Mismo gesto que con barra libre, sin tener que estabilizar.",
    steps: [
      "Coloca el banco para que la barra baje a la parte baja del pecho.",
      "Escápulas juntas y agarre algo más abierto que los hombros.",
      "Desbloquea girando la barra y baja controlando.",
      "Empuja hasta extender y bloquea al terminar.",
    ],
    tips: [
      "Ajusta los topes de seguridad a la altura del pecho.",
      "La carga no es equivalente a la de la barra libre: apunta tus pesos aparte.",
    ],
    mistakes: [
      "Banco mal colocado: la barra cae en el cuello o en el abdomen.",
      "Rebotar en el pecho.",
    ],
  },
  "ex-contractora": {
    source: "Butterfly",
    summary: "Aperturas en máquina (contractora o pec deck). Aísla el pecho.",
    steps: [
      "Asiento a la altura para que las asas queden a la altura del pecho.",
      "Codos ligeramente flexionados y espalda en el respaldo.",
      "Junta las asas delante del pecho apretando 1 s.",
      "Abre controlando hasta notar estiramiento.",
    ],
    tips: [
      "Piensa en abrazar un árbol: el movimiento es de los brazos, no de las manos.",
      "Rango de 10-15 reps.",
    ],
    mistakes: [
      "Empujar con las manos como si fuera un press.",
      "Abrir de golpe: castiga el hombro.",
    ],
  },
  "ex-cruce-poleas": {
    source: "Cable_Crossover",
    summary: "Aperturas con dos poleas. Tensión constante en el pecho en todo el recorrido.",
    steps: [
      "Poleas altas, un estribo en cada mano y un pie adelantado.",
      "Torso algo inclinado hacia delante y codos ligeramente flexionados.",
      "Junta las manos delante de la cadera en arco.",
      "Vuelve despacio hasta notar estiramiento.",
    ],
    tips: [
      "Poleas bajas y las manos hacia arriba: más pecho superior.",
      "Cruza un poco las manos al final para apretar más.",
    ],
    mistakes: ["Doblar mucho los codos: se convierte en un press.", "Balancear el cuerpo."],
  },

  // ── Empuje vertical ──
  "ex-press-militar": {
    source: "Standing_Military_Press",
    summary: "Press de hombro de pie con barra. Hombro, tríceps y estabilidad de tronco.",
    steps: [
      "Barra sobre los hombros, agarre algo más abierto que los hombros y codos un poco por delante.",
      "Aprieta glúteos y abdomen.",
      "Empuja en vertical apartando la cabeza y métela debajo de la barra al pasar.",
      "Baja controlando hasta la clavícula.",
    ],
    tips: [
      "La barra sube en línea recta: es la cabeza la que se aparta.",
      "Muñecas rectas, barra sobre la palma.",
    ],
    mistakes: [
      "Arquear mucho la espalda para empujar.",
      "Ayudarse con las piernas (eso ya es push press).",
    ],
  },
  "ex-press-hombro-mancuernas": {
    source: "Dumbbell_Shoulder_Press",
    summary: "Press de hombro con mancuernas, sentado o de pie.",
    steps: [
      "Banco a 90° o casi, mancuernas a la altura de los hombros.",
      "Palmas al frente o algo giradas, codos ligeramente por delante.",
      "Empuja hasta arriba sin chocar las mancuernas.",
      "Baja hasta la altura de las orejas.",
    ],
    tips: [
      "Un agarre semineutro suele molestar menos al hombro.",
      "Sube las mancuernas a los hombros apoyándolas en los muslos.",
    ],
    mistakes: ["Arquear la espalda separándola del respaldo.", "Bajar poco."],
  },
  "ex-flexiones-pike": {
    summary: "Flexiones con la cadera alta (forma de V invertida). Hombro sin material.",
    steps: [
      "Desde posición de flexión, camina con los pies hacia las manos y sube la cadera.",
      "Manos a la anchura de los hombros y cabeza entre los brazos.",
      "Flexiona los codos llevando la cabeza hacia el suelo, por delante de las manos.",
      "Empuja hasta extender.",
    ],
    tips: [
      "Con los pies en una silla o banco, más difícil.",
      "El siguiente paso es la flexión en pino contra la pared.",
    ],
    mistakes: ["Bajar la cadera: se convierte en una flexión normal.", "Abrir los codos del todo."],
  },
  "ex-press-hombro-maquina": {
    source: "Machine_Shoulder_Military_Press",
    summary: "Press de hombro guiado. Fácil de cargar y seguro para ir cerca del fallo.",
    steps: [
      "Ajusta el asiento para que las asas queden a la altura de los hombros.",
      "Espalda pegada al respaldo.",
      "Empuja hasta casi extender.",
      "Baja controlando hasta la altura de las orejas.",
    ],
    tips: [
      "Útil al final de la sesión cuando ya estás cansado.",
      "Agarre neutro si la máquina lo permite.",
    ],
    mistakes: ["Asiento bajo: el recorrido queda corto.", "Rebotar abajo."],
  },

  // ── Tirón horizontal ──
  "ex-remo-barra": {
    source: "Bent_Over_Barbell_Row",
    summary: "Remo Pendlay: desde el suelo y con el torso paralelo. Espalda media y dorsales.",
    steps: [
      "Barra en el suelo, torso casi paralelo al suelo y espalda neutra.",
      "Agarre prono algo más abierto que los hombros.",
      "Tira explosivo de la barra hacia la parte baja del pecho.",
      "Devuélvela al suelo y resetea en cada repetición.",
    ],
    tips: [
      "Codos hacia atrás, no hacia los lados.",
      "Si la espalda baja sufre, cambia al remo con apoyo en el pecho.",
    ],
    mistakes: [
      "Levantar el torso para ayudarte.",
      "Tirar con los bíceps sin juntar las escápulas.",
    ],
  },
  "ex-remo-mancuerna": {
    source: "One-Arm_Dumbbell_Row",
    summary: "Remo a una mano apoyado en un banco. Dorsal con mucho recorrido.",
    steps: [
      "Rodilla y mano del mismo lado sobre el banco, espalda plana.",
      "Mancuerna colgando con el brazo estirado.",
      "Tira llevando el codo hacia la cadera.",
      "Baja estirando del todo el brazo.",
    ],
    tips: [
      "Piensa en llevar el codo al bolsillo trasero.",
      "Usa correas si el agarre falla primero.",
    ],
    mistakes: [
      "Girar el torso para subir más peso.",
      "Tirar hacia el hombro en vez de hacia la cadera.",
    ],
  },
  "ex-remo-invertido": {
    source: "Inverted_Row",
    summary: "Remo con el propio cuerpo colgado de una barra baja, anillas o una mesa robusta.",
    steps: [
      "Cuélgate de una barra a la altura de la cadera, cuerpo recto y talones en el suelo.",
      "Agarre a la anchura de los hombros.",
      "Tira hasta que el pecho toque la barra, juntando escápulas.",
      "Baja controlando hasta estirar los brazos.",
    ],
    tips: ["Cuanto más horizontal estés, más difícil.", "Pies elevados o lastre para progresar."],
    mistakes: ["Cadera caída.", "Recorrido a medias."],
  },
  "ex-remo-polea": {
    source: "Seated_Cable_Rows",
    summary: "Remo sentado en polea baja. Espalda media con tensión constante.",
    steps: [
      "Siéntate con los pies en la plataforma y las rodillas algo flexionadas.",
      "Agarra el triángulo con la espalda recta y los brazos estirados.",
      "Tira hacia el abdomen llevando los codos atrás y juntando escápulas.",
      "Vuelve estirando los brazos sin perder la postura.",
    ],
    tips: [
      "Deja que las escápulas se separen al estirar: más recorrido.",
      "Agarre ancho: más espalda alta.",
    ],
    mistakes: ["Balancear el torso adelante y atrás.", "Encoger los hombros al tirar."],
  },
  "ex-remo-maquina": {
    source: "Leverage_Iso_Row",
    summary: "Remo en máquina con apoyo en el pecho. Espalda sin cargar la zona lumbar.",
    steps: [
      "Ajusta el asiento para que las asas queden a la altura del pecho.",
      "Pecho contra el respaldo y brazos estirados.",
      "Tira llevando los codos atrás y aprieta escápulas 1 s.",
      "Vuelve controlando.",
    ],
    tips: [
      "Muchas máquinas permiten trabajar un brazo cada vez.",
      "Agarre neutro: más dorsal. Prono: más espalda alta.",
    ],
    mistakes: ["Despegar el pecho del apoyo.", "Tirar con los brazos sin mover las escápulas."],
  },
  "ex-remo-t": {
    source: "T-Bar_Row_with_Handle",
    summary: "Remo en T con barra anclada o máquina. Mucha carga para la espalda media.",
    steps: [
      "A horcajadas sobre la barra, torso inclinado unos 45° y espalda neutra.",
      "Agarra el maneral con las dos manos.",
      "Tira hacia el pecho llevando los codos atrás.",
      "Baja estirando los brazos sin redondear la espalda.",
    ],
    tips: [
      "Si hay versión con apoyo en el pecho, mejor para la espalda baja.",
      "Sin maneral, mete un triángulo bajo la barra.",
    ],
    mistakes: ["Levantar el torso para tirar.", "Recorrido corto con demasiado peso."],
  },

  // ── Tirón vertical ──
  "ex-dominadas": {
    source: "Weighted_Pull_Ups",
    summary: "Dominadas con lastre: el mejor tirón vertical. Dorsales, bíceps y agarre.",
    steps: [
      "Agarre prono algo más abierto que los hombros, lastre en un cinturón o mochila.",
      "Desde colgado, baja las escápulas antes de flexionar los brazos.",
      "Tira hasta pasar la barbilla de la barra.",
      "Baja controlando hasta estirar los brazos.",
    ],
    tips: [
      "Sin lastre si aún no haces 8 limpias.",
      "Lleva el pecho hacia la barra, no la barbilla.",
    ],
    mistakes: ["Balancearte para subir (kipping).", "Medias repeticiones sin estirar abajo."],
  },
  "ex-jalon-pecho": {
    source: "Wide-Grip_Lat_Pulldown",
    summary: "Jalón en polea alta con agarre ancho. Alternativa regulable a las dominadas.",
    steps: [
      "Ajusta el rodillo para que los muslos queden fijos.",
      "Agarre prono más abierto que los hombros.",
      "Tira de la barra a la parte alta del pecho, con el pecho alto.",
      "Sube controlando hasta estirar los brazos.",
    ],
    tips: [
      "Inclínate un poco atrás, no mucho.",
      "Empieza bajando las escápulas, después flexiona codos.",
    ],
    mistakes: ["Tirar por detrás de la nuca.", "Echarse muy atrás y convertirlo en un remo."],
  },
  "ex-jalon-neutro": {
    source: "V-Bar_Pulldown",
    summary:
      "Jalón con triángulo (agarre neutro y cerrado). Más dorsal bajo y menos estrés en el hombro.",
    steps: [
      "Engancha el triángulo a la polea alta y siéntate con los muslos fijos.",
      "Brazos estirados y pecho alto.",
      "Tira hacia la parte alta del pecho llevando los codos abajo y atrás.",
      "Sube controlando hasta el estiramiento completo.",
    ],
    tips: [
      "Inclínate ligeramente atrás al tirar.",
      "Muy buena opción si las dominadas te molestan en el hombro.",
    ],
    mistakes: ["Tirar con los bíceps sin bajar los codos.", "Subir sin control."],
  },

  // ── Pierna accesorio ──
  "ex-prensa": {
    source: "Leg_Press",
    summary: "Prensa inclinada. Mucho volumen de pierna sin cargar la espalda.",
    steps: [
      "Espalda y cadera pegadas al respaldo, pies a la anchura de los hombros.",
      "Quita los seguros con las piernas casi extendidas.",
      "Baja controlando hasta que las rodillas estén cerca del pecho sin despegar la cadera.",
      "Empuja sin bloquear las rodillas arriba.",
    ],
    tips: [
      "Pies bajos: más cuádriceps. Altos: más glúteo e isquios.",
      "Baja lo que te permita la cadera sin despegarse.",
    ],
    mistakes: ["Despegar la zona lumbar al bajar.", "Bloquear las rodillas de golpe arriba."],
  },
  "ex-curl-femoral": {
    source: "Lying_Leg_Curls",
    summary: "Curl femoral tumbado en máquina. Aísla los isquiotibiales.",
    steps: [
      "Tumbado boca abajo, rodillas justo fuera del banco y rodillo sobre los tobillos.",
      "Agarra las asas y pega la cadera al banco.",
      "Flexiona las rodillas llevando los talones al glúteo.",
      "Baja despacio.",
    ],
    tips: ["Puntas de los pies hacia ti: más fuerza.", "Bajada en 3 segundos."],
    mistakes: ["Levantar la cadera del banco.", "Dejar caer el peso."],
  },
  "ex-curl-femoral-sentado": {
    source: "Seated_Leg_Curl",
    summary: "Curl femoral sentado. Trabaja los isquios con más estiramiento que tumbado.",
    steps: [
      "Ajusta el respaldo para que las rodillas queden alineadas con el eje de la máquina.",
      "Rodillo sobre los tobillos y la almohadilla sujetando los muslos.",
      "Flexiona las rodillas todo lo posible.",
      "Vuelve despacio hasta casi estirar.",
    ],
    tips: ["Inclina el torso adelante para más estiramiento.", "Rangos de 10-15 reps."],
    mistakes: ["Rodillas desalineadas con el eje.", "Rebotar arriba."],
  },
  "ex-extension-cuadriceps": {
    source: "Leg_Extensions",
    summary: "Extensión de rodilla en máquina. Aísla el cuádriceps.",
    steps: [
      "Rodillas alineadas con el eje de la máquina y rodillo sobre los tobillos.",
      "Agarra las asas laterales.",
      "Extiende las rodillas hasta arriba y aprieta 1 s.",
      "Baja controlando.",
    ],
    tips: ["Úsala tras los básicos o si la prensa está ocupada.", "Rangos de 12-15 reps."],
    mistakes: ["Lanzar el peso con impulso.", "Levantar la cadera del asiento."],
  },
  "ex-zancadas-mancuernas": {
    source: "Dumbbell_Lunges",
    summary: "Zancadas con mancuernas. Pierna a una pierna con equilibrio.",
    steps: [
      "De pie con una mancuerna en cada mano.",
      "Da un paso largo al frente.",
      "Baja hasta que la rodilla de atrás casi toque el suelo.",
      "Empuja con el pie delantero para volver y alterna piernas.",
    ],
    tips: [
      "Paso largo: más glúteo. Corto: más cuádriceps.",
      "También vale caminando o hacia atrás.",
    ],
    mistakes: [
      "Paso demasiado corto: la rodilla se adelanta mucho.",
      "Inclinar el torso hacia delante.",
    ],
  },
  "ex-sentadilla-pistol": {
    source: "Kettlebell_Pistol_Squat",
    summary: "Sentadilla a una pierna con asistencia (marco de puerta, TRX o banco).",
    steps: [
      "De pie sobre una pierna, la otra estirada al frente.",
      "Sujétate a un apoyo con las manos.",
      "Baja todo lo que puedas controlando, con el talón apoyado.",
      "Sube ayudándote lo mínimo con los brazos.",
    ],
    tips: [
      "Empieza bajando a un banco y ve bajando la altura.",
      "Cuando te salga sin ayuda, sujeta un peso al frente como contrapeso.",
    ],
    mistakes: ["Levantar el talón.", "Que la rodilla se vaya hacia dentro."],
  },

  // ── Hombro accesorio ──
  "ex-elevaciones-laterales": {
    source: "Cable_Seated_Lateral_Raise",
    summary: "Elevaciones laterales en polea baja. Deltoides lateral con tensión constante.",
    steps: [
      "De lado a la polea baja, agarra el estribo con la mano más alejada.",
      "Codo ligeramente flexionado.",
      "Eleva el brazo hacia el lado hasta la altura del hombro.",
      "Baja despacio.",
    ],
    tips: ["Inclínate un poco hacia la polea para más recorrido.", "Peso ligero, 12-20 reps."],
    mistakes: ["Subir por encima del hombro encogiendo el trapecio.", "Balancear el cuerpo."],
  },
  "ex-elevaciones-mancuernas": {
    source: "Side_Lateral_Raise",
    summary: "Elevaciones laterales con mancuernas. Hombros más anchos.",
    steps: [
      "De pie, mancuernas a los lados y codos ligeramente flexionados.",
      "Eleva hacia los lados hasta la altura de los hombros.",
      "Piensa en llevar las mancuernas lejos, no arriba.",
      "Baja en 2-3 segundos.",
    ],
    tips: ["Torso ligeramente adelantado.", "Mejor ligero y controlado que pesado con impulso."],
    mistakes: ["Encoger los hombros.", "Usar impulso de la cadera."],
  },
  "ex-face-pull-invertido": {
    summary: "Pájaros con el propio cuerpo colgado de una barra baja o anillas. Hombro posterior.",
    steps: [
      "Cuélgate de una barra baja o anillas, cuerpo recto e inclinado hacia atrás.",
      "Brazos estirados al frente.",
      "Abre los brazos en cruz llevando el pecho hacia arriba.",
      "Vuelve controlando.",
    ],
    tips: [
      "Cuanto más vertical estés, más fácil.",
      "Con gomas elásticas tienes una alternativa (band pull-apart).",
    ],
    mistakes: ["Doblar mucho los codos: se convierte en un remo.", "Cadera caída."],
  },
  "ex-face-pull": {
    source: "Face_Pull",
    summary: "Tirón a la cara en polea alta con cuerda. Hombro posterior y salud del manguito.",
    steps: [
      "Polea a la altura de la cara con la cuerda.",
      "Agarra con las palmas hacia dentro y da un paso atrás.",
      "Tira hacia la frente separando las manos y llevando los codos altos.",
      "Vuelve controlando.",
    ],
    tips: [
      "Al final, gira las manos hacia atrás como enseñando bíceps.",
      "Muy buen ejercicio de calentamiento para el press.",
    ],
    mistakes: ["Tirar hacia el pecho: es un remo.", "Echar el cuerpo atrás."],
  },
  "ex-pajaros-polea": {
    source: "Cable_Rear_Delt_Fly",
    summary: "Pájaros en polea cruzada. Aísla el deltoides posterior.",
    steps: [
      "Poleas a la altura de los hombros, cables cruzados: mano derecha al cable izquierdo y viceversa.",
      "Brazos estirados al frente.",
      "Abre los brazos hacia atrás hasta alinearlos con el cuerpo.",
      "Vuelve despacio.",
    ],
    tips: ["Codos casi estirados y fijos.", "Peso ligero, 12-20 reps."],
    mistakes: ["Juntar las escápulas en exceso: trabaja la espalda.", "Encoger los hombros."],
  },

  // ── Tríceps ──
  "ex-fondos-triceps": {
    source: "Dips_-_Triceps_Version",
    summary: "Fondos en paralelas. Tríceps y pecho con el propio cuerpo y lastre.",
    steps: [
      "Sujétate en las paralelas con los brazos estirados.",
      "Torso vertical y codos pegados para enfatizar el tríceps.",
      "Baja hasta que los codos lleguen a unos 90°.",
      "Empuja hasta extender.",
    ],
    tips: [
      "Lastra con cinturón o mochila cuando hagas más de 12.",
      "Inclinarte adelante carga más el pecho.",
    ],
    mistakes: ["Bajar demasiado si te molesta el hombro.", "Encoger los hombros hacia las orejas."],
  },
  "ex-press-frances": {
    source: "EZ-Bar_Skullcrusher",
    summary: "Press francés tumbado con barra Z. Tríceps con mucha carga.",
    steps: [
      "Tumbado en banco, barra Z sobre el pecho con los brazos estirados.",
      "Lleva un poco los brazos hacia atrás, hacia la cabeza.",
      "Flexiona solo los codos bajando la barra hacia la frente o por detrás.",
      "Extiende sin mover los hombros.",
    ],
    tips: [
      "Bajar por detrás de la cabeza estira más el tríceps.",
      "Un compañero o calentamiento extra si te molestan los codos.",
    ],
    mistakes: ["Abrir los codos hacia fuera.", "Mover los hombros: se convierte en un press."],
  },
  "ex-extension-mancuerna": {
    source: "Standing_Dumbbell_Triceps_Extension",
    summary: "Extensión por encima de la cabeza con mancuerna. Porción larga del tríceps.",
    steps: [
      "De pie o sentado, una mancuerna sujeta con las dos manos por encima de la cabeza.",
      "Codos apuntando al techo.",
      "Baja la mancuerna por detrás de la cabeza flexionando los codos.",
      "Extiende hasta arriba.",
    ],
    tips: [
      "Sentado con respaldo, la espalda sufre menos.",
      "Controla la bajada: es donde más trabaja.",
    ],
    mistakes: ["Abrir los codos.", "Arquear la espalda."],
  },
  "ex-extension-polea": {
    source: "Triceps_Pushdown_-_Rope_Attachment",
    summary: "Extensión de tríceps en polea alta con cuerda. Fácil de controlar y ajustar.",
    steps: [
      "Polea alta con cuerda, codos pegados al cuerpo.",
      "Torso ligeramente inclinado.",
      "Extiende los codos separando la cuerda abajo.",
      "Sube controlando hasta los 90°.",
    ],
    tips: ["Los codos no se mueven: solo el antebrazo.", "Con barra recta puedes cargar más."],
    mistakes: ["Mover los codos hacia delante.", "Echar el cuerpo encima del peso."],
  },

  // ── Bíceps ──
  "ex-curl-barra": {
    source: "EZ-Bar_Curl",
    summary: "Curl con barra Z. El básico del bíceps, más cómodo para las muñecas.",
    steps: [
      "De pie, barra Z con agarre supino a la anchura de los hombros.",
      "Codos pegados a los costados.",
      "Flexiona los codos subiendo la barra hacia los hombros.",
      "Baja controlando hasta estirar.",
    ],
    tips: ["Bajada en 2-3 segundos.", "Si necesitas impulso, baja el peso."],
    mistakes: ["Balancear el cuerpo.", "Adelantar los codos al subir."],
  },
  "ex-curl-mancuernas": {
    source: "Hammer_Curls",
    summary: "Curl martillo con mancuernas. Bíceps, braquial y antebrazo.",
    steps: [
      "De pie, mancuernas a los lados con las palmas mirándose.",
      "Codos pegados al cuerpo.",
      "Sube la mancuerna sin girar la muñeca.",
      "Baja controlando. Alterna o a la vez.",
    ],
    tips: ["Hazlo cruzando hacia el pecho para variar.", "Codos quietos."],
    mistakes: ["Usar impulso de la espalda.", "Recorrido incompleto abajo."],
  },
  "ex-dominadas-supinas": {
    source: "Chin-Up",
    summary: "Dominadas con agarre supino. Más bíceps que las pronas.",
    steps: [
      "Agarre supino (palmas hacia ti) a la anchura de los hombros.",
      "Desde colgado, baja las escápulas.",
      "Tira hasta que la barbilla pase la barra.",
      "Baja controlando hasta estirar.",
    ],
    tips: ["Lastre cuando hagas más de 10.", "Aprieta los bíceps arriba 1 s."],
    mistakes: ["Kipping o balanceo.", "No estirar abajo."],
  },
  "ex-curl-polea": {
    source: "Standing_Biceps_Cable_Curl",
    summary: "Curl de bíceps en polea baja. Tensión constante en todo el recorrido.",
    steps: [
      "Polea baja con barra o cuerda, de pie frente a ella.",
      "Codos pegados al cuerpo.",
      "Flexiona los codos hasta arriba.",
      "Baja despacio hasta estirar.",
    ],
    tips: ["Da un paso atrás para tener tensión abajo.", "Rangos de 10-15 reps."],
    mistakes: ["Adelantar los codos.", "Echar el cuerpo atrás."],
  },
};
