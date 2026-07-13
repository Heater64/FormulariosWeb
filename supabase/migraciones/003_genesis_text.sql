-- ============================================================
-- Migración 003: Texto bíblico RV60 — Génesis (50 capítulos)
-- Formato: versículo por fila
-- ============================================================

-- Helper: obtener UUID de un capítulo por libro_id y número
DO $$
DECLARE
  v_cap_id UUID;
  v_libro_id CONSTANT INTEGER := 1; -- Génesis
BEGIN

-- Capítulo 1
SELECT id INTO v_cap_id FROM capitulos WHERE libro_id = v_libro_id AND numero = 1;
INSERT INTO versiculos (capitulo_id, numero, texto) VALUES
(v_cap_id, 1, 'En el principio creó Dios los cielos y la tierra.'),
(v_cap_id, 2, 'Y la tierra estaba desordenada y vacía, y las tinieblas estaban sobre la faz del abismo, y el Espíritu de Dios se movía sobre la faz de las aguas.'),
(v_cap_id, 3, 'Y dijo Dios: Sea la luz; y fue la luz.'),
(v_cap_id, 4, 'Y vio Dios que la luz era buena; y separó Dios la luz de las tinieblas.'),
(v_cap_id, 5, 'Y llamó Dios a la luz Día, y a las tinieblas llamó Noche. Y fue la tarde y la mañana un día.'),
(v_cap_id, 6, 'Luego dijo Dios: Haya expansión en medio de las aguas, y separe las aguas de las aguas.'),
(v_cap_id, 7, 'E hizo Dios la expansión, y separó las aguas que estaban debajo de la expansión, de las aguas que estaban sobre la expansión. Y fue así.'),
(v_cap_id, 8, 'Y llamó Dios a la expansión Cielos. Y fue la tarde y la mañana el día segundo.'),
(v_cap_id, 9, 'Dijo también Dios: Júntense las aguas que están debajo de los cielos en un lugar, y descúbrase lo seco. Y fue así.'),
(v_cap_id, 10, 'Y llamó Dios a lo seco Tierra, y a la reunión de las aguas llamó Mares. Y vio Dios que era bueno.'),
(v_cap_id, 11, 'Después dijo Dios: Produzca la tierra hierba verde, hierba que dé semilla, y árbol de fruto que dé fruto según su género, que su semilla esté en él, sobre la tierra. Y fue así.'),
(v_cap_id, 12, 'Produjo, pues, la tierra hierba verde, hierba que da semilla según su naturaleza, y árbol que da fruto, cuya semilla está en él, según su género. Y vio Dios que era bueno.'),
(v_cap_id, 13, 'Y fue la tarde y la mañana el día tercero.'),
(v_cap_id, 14, 'Dijo luego Dios: Haya lumbreras en la expansión de los cielos para separar el día de la noche; y sirvan de señales para las estaciones, para días y años,'),
(v_cap_id, 15, 'y sean por lumbreras en la expansión de los cielos para alumbrar sobre la tierra. Y fue así.'),
(v_cap_id, 16, 'E hizo Dios las dos grandes lumbreras; la lumbrera mayor para que señorease en el día, y la lumbrera menor para que señorease en la noche; hizo también las estrellas.'),
(v_cap_id, 17, 'Y las puso Dios en la expansión de los cielos para alumbrar sobre la tierra,'),
(v_cap_id, 18, 'y para señorear en el día y en la noche, y para separar la luz de las tinieblas. Y vio Dios que era bueno.'),
(v_cap_id, 19, 'Y fue la tarde y la mañana el día cuarto.'),
(v_cap_id, 20, 'Dijo Dios: Produzcan las aguas seres vivientes, y aves que vuelen sobre la tierra, en la abierta expansión de los cielos.'),
(v_cap_id, 21, 'Y creó Dios los grandes monstruos marinos, y todo ser viviente que se mueve, que las aguas produjeron según su género, y toda ave alada según su género. Y vio Dios que era bueno.'),
(v_cap_id, 22, 'Y Dios los bendijo, diciendo: Fructificad y multiplicaos, y llenad las aguas en los mares, y multiplíquense las aves en la tierra.'),
(v_cap_id, 23, 'Y fue la tarde y la mañana el día quinto.'),
(v_cap_id, 24, 'Luego dijo Dios: Produzca la tierra seres vivientes según su género, bestias y serpientes y animales de la tierra según su género. Y fue así.'),
(v_cap_id, 25, 'E hizo Dios animales de la tierra según su género, y ganado según su género, y todo animal que se arrastra sobre la tierra según su género. Y vio Dios que era bueno.'),
(v_cap_id, 26, 'Entonces dijo Dios: Hagamos al hombre a nuestra imagen, conforme a nuestra semejanza; y señoree en los peces del mar, en las aves de los cielos, en las bestias, en toda la tierra, y en todo animal que se arrastra sobre la tierra.'),
(v_cap_id, 27, 'Y creó Dios al hombre a su imagen, a imagen de Dios lo creó; varón y hembra los creó.'),
(v_cap_id, 28, 'Y los bendijo Dios, y les dijo: Fructificad y multiplicaos; llenad la tierra, y sojuzgadla, y señoread en los peces del mar, en las aves de los cielos, y en todas las bestias que se mueven sobre la tierra.'),
(v_cap_id, 29, 'Y dijo Dios: He aquí que os he dado toda planta que da semilla, que está sobre toda la tierra, y todo árbol en que hay fruto y que da semilla; os serán para comer.'),
(v_cap_id, 30, 'Y a toda bestia de la tierra, y a todas las aves de los cielos, y a todo lo que se arrastra sobre la tierra, en que hay vida, toda planta verde les será para comer. Y fue así.'),
(v_cap_id, 31, 'Y vio Dios todo cuanto había hecho, y he aquí que era bueno en gran manera. Y fue la tarde y la mañana el día sexto.')
ON CONFLICT (capitulo_id, numero) DO NOTHING;

-- Capítulo 2
SELECT id INTO v_cap_id FROM capitulos WHERE libro_id = v_libro_id AND numero = 2;
INSERT INTO versiculos (capitulo_id, numero, texto) VALUES
(v_cap_id, 1, 'Fueron, pues, acabados los cielos y la tierra, y todo el ejército de ellos.'),
(v_cap_id, 2, 'Y acabó Dios en el día séptimo la obra que hizo; y reposó el día séptimo de toda la obra que hizo.'),
(v_cap_id, 3, 'Y bendijo Dios al día séptimo, y lo santificó, porque en él reposó de toda la obra que había hecho en la creación.'),
(v_cap_id, 4, 'Estos son los orígenes de los cielos y de la tierra cuando fueron creados, el día que Jehová Dios hizo la tierra y los cielos,'),
(v_cap_id, 5, 'y toda planta del campo antes que fuese en la tierra, y toda hierba del campo antes que naciese; porque Jehová Dios aún no había hecho llover sobre la tierra, ni había hombre para que labrase la tierra,'),
(v_cap_id, 6, 'sino que subía de la tierra un vapor, el cual regaba toda la faz de la tierra.'),
(v_cap_id, 7, 'Entonces Jehová Dios formó al hombre del polvo de la tierra, y sopló en su nariz aliento de vida, y fue el hombre un ser viviente.'),
(v_cap_id, 8, 'Y Jehová Dios plantó un huerto en Edén, al oriente, y puso allí al hombre que había formado.'),
(v_cap_id, 9, 'Y Jehová Dios hizo nacer de la tierra todo árbol delicioso a la vista, y bueno para comer; también el árbol de vida en medio del huerto, y el árbol de la ciencia del bien y del mal.'),
(v_cap_id, 10, 'Y salía de Edén un río para regar el huerto, y de allí se repartía en cuatro brazos.'),
(v_cap_id, 11, 'El nombre del uno era Pisón; este es el que rodea toda la tierra de Havila, donde hay oro;'),
(v_cap_id, 12, 'y el oro de aquella tierra es bueno; hay allí también bedelio y ónice.'),
(v_cap_id, 13, 'El nombre del segundo río es Gihón; este es el que rodea toda la tierra de Cus.'),
(v_cap_id, 14, 'Y el nombre del tercer río es Hidekel; este es el que va al oriente de Asiria. Y el cuarto río es el Eufrates.'),
(v_cap_id, 15, 'Tomó, pues, Jehová Dios al hombre, y lo puso en el huerto de Edén, para que lo labrara y lo guardase.'),
(v_cap_id, 16, 'Y mandó Jehová Dios al hombre, diciendo: De todo árbol del huerto podrás comer;'),
(v_cap_id, 17, 'mas del árbol de la ciencia del bien y del mal no comerás; porque el día que de él comieres, ciertamente morirás.'),
(v_cap_id, 18, 'Y dijo Jehová Dios: No es bueno que el hombre esté solo; le haré ayuda idónea para él.'),
(v_cap_id, 19, 'Jehová Dios formó, pues, de la tierra toda bestia del campo, y toda ave de los cielos, y las trajo a Adán para que viese cómo las había de llamar; y todo lo que Adán llamó a los animales vivientes, ese es su nombre.'),
(v_cap_id, 20, 'Y puso Adán nombre a toda bestia y ave de los cielos y a todo ganado del campo; mas para Adán no se halló ayuda idónea para él.'),
(v_cap_id, 21, 'Entonces Jehová Dios hizo caer sueño profundo sobre Adán, y mientras éste dormía, tomó una de sus costillas, y cerró la carne en su lugar.'),
(v_cap_id, 22, 'Y de la costilla que Jehová Dios tomó del hombre, hizo una mujer, y la trajo al hombre.'),
(v_cap_id, 23, 'Dijo entonces Adán: Esto es ahora hueso de mis huesos y carne de mi carne; esta será llamada Varona, porque del varón fue tomada.'),
(v_cap_id, 24, 'Por tanto, dejará el hombre a su padre y a su madre, y se unirá a su mujer, y serán una sola carne.'),
(v_cap_id, 25, 'Y estaban ambos desnudos, Adán y su mujer, y no se avergonzaban.')
ON CONFLICT (capitulo_id, numero) DO NOTHING;

-- Capítulo 3
SELECT id INTO v_cap_id FROM capitulos WHERE libro_id = v_libro_id AND numero = 3;
INSERT INTO versiculos (capitulo_id, numero, texto) VALUES
(v_cap_id, 1, 'Pero la serpiente era astuta, más que todos los animales del campo que Jehová Dios había hecho; la cual dijo a la mujer: ¿Conque Dios os ha dicho: No comáis de todo árbol del huerto?'),
(v_cap_id, 2, 'Y la mujer respondió a la serpiente: Del fruto de los árboles del huerto podemos comer;'),
(v_cap_id, 3, 'pero del fruto del árbol que está en medio del huerto dijo Dios: No comeréis de él, ni le tocaréis, para que no muráis.'),
(v_cap_id, 4, 'Entonces la serpiente dijo a la mujer: No moriréis;'),
(v_cap_id, 5, 'sino que sabe Dios que el día que comáis de él, serán abiertos vuestros ojos, y seréis como Dios, sabiendo el bien y el mal.'),
(v_cap_id, 6, 'Y vio la mujer que el árbol era bueno para comer, y que era agradable a los ojos, y árbol codiciable para alcanzar la sabiduría; y tomó de su fruto, y comió; y dio también a su marido, el cual comió así como ella.'),
(v_cap_id, 7, 'Entonces fueron abiertos los ojos de ambos, y conocieron que estaban desnudos; entonces cosieron hojas de higuera, y se hicieron delantales.'),
(v_cap_id, 8, 'Y oyeron la voz de Jehová Dios que se paseaba en el huerto al aire del día; y el hombre y su mujer se escondieron de la presencia de Jehová Dios entre los árboles del huerto.'),
(v_cap_id, 9, 'Mas Jehová Dios llamó al hombre, y le dijo: ¿Dónde estás tú?'),
(v_cap_id, 10, 'Y él respondió: Oí tu voz en el huerto, y tuve miedo, porque estaba desnudo; y me escondí.'),
(v_cap_id, 11, 'Y Dios le dijo: ¿Quién te enseñó que estabas desnudo? ¿Has comido del árbol de que yo te mandé no comieses?'),
(v_cap_id, 12, 'Y el hombre respondió: La mujer que me diste por compañera me dio del árbol, y yo comí.'),
(v_cap_id, 13, 'Entonces Jehová Dios dijo a la mujer: ¿Qué es lo que has hecho? Y dijo la mujer: La serpiente me engañó, y comí.'),
(v_cap_id, 14, 'Y Jehová Dios dijo a la serpiente: Por cuanto esto hiciste, maldita serás entre todas las bestias y entre todos los animales del campo; sobre tu pecho andarás, y polvo comerás todos los días de tu vida.'),
(v_cap_id, 15, 'Y pondré enemistad entre ti y la mujer, y entre tu simiente y la simiente suya; ésta te herirá en la cabeza, y tú le herirás en el calcañar.'),
(v_cap_id, 16, 'A la mujer dijo: Multiplicaré en gran manera los dolores de tu preñez; con dolor darás a luz los hijos; y tu deseo será para tu marido, y él se enseñoreará de ti.'),
(v_cap_id, 17, 'Y al hombre dijo: Por cuanto obedeciste a la voz de tu mujer, y comiste del árbol de que te mandé diciendo: No comerás de él; maldita será la tierra por tu causa; con dolor comerás de ella todos los días de tu vida.'),
(v_cap_id, 18, 'Espinos y cardos te producirá, y comerás plantas del campo.'),
(v_cap_id, 19, 'Con el sudor de tu rostro comerás el pan hasta que vuelvas a la tierra, porque de ella fuiste tomado; pues polvo eres, y al polvo volverás.'),
(v_cap_id, 20, 'Y llamó Adán el nombre de su mujer, Eva, por cuanto ella fue madre de todos los vivientes.'),
(v_cap_id, 21, 'Y Jehová Dios hizo al hombre y a su mujer túnicas de pieles, y los vistió.'),
(v_cap_id, 22, 'Y dijo Jehová Dios: He aquí el hombre es como uno de nosotros, sabiendo el bien y el mal; ahora, pues, que no alargue su mano, y tome también del árbol de la vida, y coma, y viva para siempre.'),
(v_cap_id, 23, 'Y lo sacó Jehová Dios del huerto de Edén, para que labrase la tierra de que fue tomado.'),
(v_cap_id, 24, 'Echó, pues, fuera al hombre, y puso al oriente del huerto de Edén querubines, y una espada encendida que se revolvía por todos lados, para guardar el camino del árbol de la vida.')
ON CONFLICT (capitulo_id, numero) DO NOTHING;

-- Capítulo 4
SELECT id INTO v_cap_id FROM capitulos WHERE libro_id = v_libro_id AND numero = 4;
INSERT INTO versiculos (capitulo_id, numero, texto) VALUES
(v_cap_id, 1, 'Conoció Adán a su mujer Eva, la cual concibió y dio a luz a Caín, y dijo: Por voluntad de Jehová he adquirido varón.'),
(v_cap_id, 2, 'Después dio a luz a su hermano Abel. Y Abel fue pastor de ovejas, y Caín fue labrador de la tierra.'),
(v_cap_id, 3, 'Y aconteció andando el tiempo, que Caín trajo del fruto de la tierra una ofrenda a Jehová.'),
(v_cap_id, 4, 'Y Abel trajo también de los primogénitos de sus ovejas, de lo más gordo de ellas. Y miró Jehová con agrado a Abel y a su ofrenda;'),
(v_cap_id, 5, 'pero no miró con agrado a Caín y a la ofrenda suya. Y se ensañó Caín en gran manera, y decayó su semblante.'),
(v_cap_id, 6, 'Entonces Jehová dijo a Caín: ¿Por qué te has ensañado, y por qué ha decaído tu semblante?'),
(v_cap_id, 7, 'Si bien hicieres, ¿no serás enaltecido? y si no hicieres bien, el pecado está a la puerta; con todo esto, a ti será su deseo, y tú te enseñorearás de él.'),
(v_cap_id, 8, 'Y dijo Caín a su hermano Abel: Salgamos al campo. Y aconteció que estando ellos en el campo, Caín se levantó contra su hermano Abel, y lo mató.'),
(v_cap_id, 9, 'Y Jehová dijo a Caín: ¿Dónde está Abel tu hermano? Y él respondió: No sé. ¿Soy yo acaso guarda de mi hermano?'),
(v_cap_id, 10, 'Y él le dijo: ¿Qué has hecho? La voz de la sangre de tu hermano clama a mí desde la tierra.'),
(v_cap_id, 11, 'Ahora, pues, maldito seas tú de la tierra, que abrió su boca para recibir de tu mano la sangre de tu hermano.'),
(v_cap_id, 12, 'Cuando labres la tierra, no te volverá a dar su fuerza; errante y extranjero serás en la tierra.'),
(v_cap_id, 13, 'Y dijo Caín a Jehová: Grande es mi castigo para ser soportado.'),
(v_cap_id, 14, 'He aquí me echas hoy de la faz de la tierra, y de tu presencia me esconderé, y seré errante y extranjero en la tierra; y sucederá que cualquiera que me hallare, me matará.'),
(v_cap_id, 15, 'Y le respondió Jehová: Ciertamente cualquiera que matare a Caín, siete veces será castigado. Entonces Jehová puso señal en Caín, para que no lo matase cualquiera que lo hallara.'),
(v_cap_id, 16, 'Salió, pues, Caín de delante de Jehová, y habitó en tierra de Nod, al oriente de Edén.'),
(v_cap_id, 17, 'Y conoció Caín a su mujer, la cual concibió y dio a luz a Enoc; y edificó una ciudad, y llamó el nombre de la ciudad del nombre de su hijo, Enoc.'),
(v_cap_id, 18, 'Y a Enoc le nació Irad, e Irad engendró a Mehujael, y Mehujael engendró a Metusael, y Metusael engendró a Lamec.'),
(v_cap_id, 19, 'Y Lamec tomó para sí dos mujeres; el nombre de una fue Ada, y el nombre de la otra, Zila.'),
(v_cap_id, 20, 'Y Ada dio a luz a Jabal, el cual fue padre de los que habitan en tiendas y crían ganados.'),
(v_cap_id, 21, 'Y el nombre de su hermano fue Jubal, el cual fue padre de todos los que tocan arpa y flauta.'),
(v_cap_id, 22, 'Y Zila también dio a luz a Tubal-Caín, artífice de todo instrumento de bronce y de hierro; y la hermana de Tubal-Caín fue Naama.'),
(v_cap_id, 23, 'Y dijo Lamec a sus mujeres: Ada y Zila, oíd mi voz; mujeres de Lamec, escuchad mi dicho: Que varón mataré por mi herida, y joven por mi golpe.'),
(v_cap_id, 24, 'Si siete veces será vengado Caín, Lamec en verdad setenta veces siete lo será.'),
(v_cap_id, 25, 'Y conoció de nuevo Adán a su mujer, la cual dio a luz un hijo, y llamó su nombre Set, porque Dios (dijo ella) me ha sustituido otro hijo en lugar de Abel, a quien mató Caín.'),
(v_cap_id, 26, 'Y a Set también le nació un hijo, y llamó su nombre Enós. Entonces los hombres comenzaron a invocar el nombre de Jehová.')
ON CONFLICT (capitulo_id, numero) DO NOTHING;

-- Capítulo 5
SELECT id INTO v_cap_id FROM capitulos WHERE libro_id = v_libro_id AND numero = 5;
INSERT INTO versiculos (capitulo_id, numero, texto) VALUES
(v_cap_id, 1, 'Este es el libro de las generaciones de Adán. El día en que creó Dios al hombre, a semejanza de Dios lo hizo.'),
(v_cap_id, 2, 'Varón y hembra los creó; y los bendijo, y llamó el nombre de ellos Adán, el día en que fueron creados.'),
(v_cap_id, 3, 'Y vivió Adán ciento treinta años, y engendró un hijo a su semejanza, conforme a su imagen, y llamó su nombre Set.'),
(v_cap_id, 4, 'Y fueron los días de Adán después que engendró a Set, ochocientos años, y engendró hijos e hijas.'),
(v_cap_id, 5, 'Y fueron todos los días que vivió Adán novecientos treinta años; y murió.'),
(v_cap_id, 6, 'Vivió Set ciento cinco años, y engendró a Enós.'),
(v_cap_id, 7, 'Y vivió Set, después que engendró a Enós, ochocientos siete años, y engendró hijos e hijas.'),
(v_cap_id, 8, 'Y fueron todos los días de Set novecientos doce años; y murió.'),
(v_cap_id, 9, 'Vivió Enós noventa años, y engendró a Cainán.'),
(v_cap_id, 10, 'Y vivió Enós, después que engendró a Cainán, ochocientos quince años, y engendró hijos e hijas.'),
(v_cap_id, 11, 'Y fueron todos los días de Enós novecientos cinco años; y murió.'),
(v_cap_id, 12, 'Vivió Cainán setenta años, y engendró a Mahalaleel.'),
(v_cap_id, 13, 'Y vivió Cainán, después que engendró a Mahalaleel, ochocientos cuarenta años, y engendró hijos e hijas.'),
(v_cap_id, 14, 'Y fueron todos los días de Cainán novecientos diez años; y murió.'),
(v_cap_id, 15, 'Vivió Mahalaleel sesenta y cinco años, y engendró a Jared.'),
(v_cap_id, 16, 'Y vivió Mahalaleel, después que engendró a Jared, ochocientos treinta años, y engendró hijos e hijas.'),
(v_cap_id, 17, 'Y fueron todos los días de Mahalaleel ochocientos noventa y cinco años; y murió.'),
(v_cap_id, 18, 'Vivió Jared ciento sesenta y dos años, y engendró a Enoc.'),
(v_cap_id, 19, 'Y vivió Jared, después que engendró a Enoc, ochocientos años, y engendró hijos e hijas.'),
(v_cap_id, 20, 'Y fueron todos los días de Jared novecientos sesenta y dos años; y murió.'),
(v_cap_id, 21, 'Vivió Enoc sesenta y cinco años, y engendró a Matusalén.'),
(v_cap_id, 22, 'Y caminó Enoc con Dios, después que engendró a Matusalén, trescientos años, y engendró hijos e hijas.'),
(v_cap_id, 23, 'Y fueron todos los días de Enoc trescientos sesenta y cinco años.'),
(v_cap_id, 24, 'Caminó, pues, Enoc con Dios, y desapareció, porque le llevó Dios.'),
(v_cap_id, 25, 'Vivió Matusalén ciento ochenta y siete años, y engendró a Lamec.'),
(v_cap_id, 26, 'Y vivió Matusalén, después que engendró a Lamec, setecientos ochenta y dos años, y engendró hijos e hijas.'),
(v_cap_id, 27, 'Fueron, pues, todos los días de Matusalén novecientos sesenta y nueve años; y murió.'),
(v_cap_id, 28, 'Vivió Lamec ciento ochenta y dos años, y engendró un hijo;'),
(v_cap_id, 29, 'y llamó su nombre Noé, diciendo: Este nos aliviará de nuestras obras y del trabajo de nuestras manos, a causa de la tierra que Jehová maldijo.'),
(v_cap_id, 30, 'Y vivió Lamec, después que engendró a Noé, quinientos noventa y cinco años, y engendró hijos e hijas.'),
(v_cap_id, 31, 'Y fueron todos los días de Lamec setecientos setenta y siete años; y murió.'),
(v_cap_id, 32, 'Y siendo Noé de quinientos años, engendró a Sem, a Cam y a Jafet.')
ON CONFLICT (capitulo_id, numero) DO NOTHING;

-- Capítulo 6
SELECT id INTO v_cap_id FROM capitulos WHERE libro_id = v_libro_id AND numero = 6;
INSERT INTO versiculos (capitulo_id, numero, texto) VALUES
(v_cap_id, 1, 'Aconteció que cuando comenzaron los hombres a multiplicarse sobre la faz de la tierra, y les nacieron hijas,'),
(v_cap_id, 2, 'que viendo los hijos de Dios que las hijas de los hombres eran hermosas, tomaron para sí mujeres, escogiendo entre todas.'),
(v_cap_id, 3, 'Y dijo Jehová: No contenderá mi espíritu con el hombre para siempre, porque ciertamente él es carne; mas serán sus días ciento veinte años.'),
(v_cap_id, 4, 'Había gigantes en la tierra en aquellos días, y también después que se llegaron los hijos de Dios a las hijas de los hombres, y les engendraron hijos. Estos fueron los valientes que desde la antigüedad fueron varones de renombre.'),
(v_cap_id, 5, 'Y vio Jehová que la maldad de los hombres era mucha en la tierra, y que todo designio de los pensamientos del corazón de ellos era de continuo solamente el mal.'),
(v_cap_id, 6, 'Y se arrepintió Jehová de haber hecho hombre en la tierra, y le dolió en su corazón.'),
(v_cap_id, 7, 'Y dijo Jehová: Raeré de sobre la faz de la tierra a los hombres que he creado, desde el hombre hasta la bestia, y hasta el reptil y las aves del cielo; pues me arrepiento de haberlos hecho.'),
(v_cap_id, 8, 'Pero Noé halló gracia ante los ojos de Jehová.'),
(v_cap_id, 9, 'Estas son las generaciones de Noé: Noé, varón justo, era perfecto en sus generaciones; con Dios caminó Noé.'),
(v_cap_id, 10, 'Y engendró Noé tres hijos: a Sem, a Cam y a Jafet.'),
(v_cap_id, 11, 'Y se corrompió la tierra delante de Dios, y estaba la tierra llena de violencia.'),
(v_cap_id, 12, 'Y miró Dios la tierra, y he aquí que estaba corrompida; porque toda carne había corrompido su camino sobre la tierra.'),
(v_cap_id, 13, 'Dijo, pues, Dios a Noé: He decidido el fin de todo ser, porque la tierra está llena de violencia a causa de ellos; y he aquí que yo los destruiré con la tierra.'),
(v_cap_id, 14, 'Hazte un arca de madera de gofer; harás aposentos en el arca, y la calafatearás con brea por dentro y por fuera.'),
(v_cap_id, 15, 'Y de esta manera la harás: de trescientos codos la longitud del arca, de cincuenta codos su anchura, y de treinta codos su altura.'),
(v_cap_id, 16, 'Una ventana harás al arca, y la acabarás a un codo de elevación por la parte de arriba; y la puerta del arca pondrás a su costado; y le harás piso bajo, segundo y tercero.'),
(v_cap_id, 17, 'Y he aquí que yo traigo un diluvio de aguas sobre la tierra, para destruir toda carne en que haya espíritu de vida debajo del cielo; todo lo que hay en la tierra morirá.'),
(v_cap_id, 18, 'Mas estableceré mi pacto contigo, y entrarás en el arca tú, tus hijos, tu mujer, y las mujeres de tus hijos contigo.'),
(v_cap_id, 19, 'Y de todo ser viviente, de toda carne, meterás dos de cada especie en el arca, para que tengan vida contigo; macho y hembra serán.'),
(v_cap_id, 20, 'De las aves según su especie, y de las bestias según su especie, de todo reptil de la tierra según su especie, dos de cada especie entrarán contigo, para que hayan vida.'),
(v_cap_id, 21, 'Y toma contigo de todo alimento que se come, y almacénalo, y servirá de sustento para ti y para ellos.'),
(v_cap_id, 22, 'Y lo hizo Noé; hizo conforme a todo lo que Dios le mandó.')
ON CONFLICT (capitulo_id, numero) DO NOTHING;

RAISE NOTICE 'Génesis 1-6 insertado';
END $$;
