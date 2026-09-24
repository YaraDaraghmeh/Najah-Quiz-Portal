import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log(' Starting database seed for Najah Tutoring Centre (Amman)...');

  // Clear existing records in reverse dependency order
  await prisma.answer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quizClass.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.user.deleteMany();
  await prisma.class.deleteMany();

  const commonTeacherPassword = await hashPassword('Password123!');
  const commonStudentPassword = await hashPassword('Student123!');
  const adminPassword = await hashPassword('Password123!');

  // 1. Create Classes
  console.log('Creating classes: 10A, 10B, 11A...');
  const class10A = await prisma.class.create({ data: { name: '10A' } });
  const class10B = await prisma.class.create({ data: { name: '10B' } });
  const class11A = await prisma.class.create({ data: { name: '11A' } });

  // 2. Create Admin (Nour)
  console.log('Creating Admin (Nour)...');
  const admin = await prisma.user.create({
    data: {
      name: 'نور  (Nour Admin)',
      username: 'nour',
      role: 'ADMIN',
      passwordHash: adminPassword,
    },
  });

  // 3. Create 4 Teachers
  console.log('Creating 4 Teachers with Arabic names and class assignments...');
  const teacherAhmad = await prisma.user.create({
    data: {
      name: 'أحمد الخطيب (Ahmad Al-Khatib)',
      username: 'ahmad.khatib',
      role: 'TEACHER',
      passwordHash: commonTeacherPassword,
    },
  });

  const teacherRania = await prisma.user.create({
    data: {
      name: 'رانيا الزعبي (Rania Al-Zoubi)',
      username: 'rania.zoubi',
      role: 'TEACHER',
      passwordHash: commonTeacherPassword,
    },
  });

  const teacherTareq = await prisma.user.create({
    data: {
      name: 'طارق حداد (Tareq Haddad)',
      username: 'tareq.haddad',
      role: 'TEACHER',
      passwordHash: commonTeacherPassword,
    },
  });

  const teacherMona = await prisma.user.create({
    data: {
      name: 'منى المجالي (Mona Al-Majali)',
      username: 'mona.majali',
      role: 'TEACHER',
      passwordHash: commonTeacherPassword,
    },
  });

  // Assign teachers to classes:
  // Ahmad -> 10A, 10B
  await prisma.teacherClass.createMany({
    data: [
      { teacherId: teacherAhmad.id, classId: class10A.id },
      { teacherId: teacherAhmad.id, classId: class10B.id },
      // Rania -> 11A
      { teacherId: teacherRania.id, classId: class11A.id },
      // Tareq -> 10A, 11A
      { teacherId: teacherTareq.id, classId: class10A.id },
      { teacherId: teacherTareq.id, classId: class11A.id },
      // Mona -> 10B
      { teacherId: teacherMona.id, classId: class10B.id },
    ],
  });

  // 4. Create Students (~20 per class, 60 total)
  console.log('Creating 60 students (20 per class)...');

  const students10AData = [
    { name: 'عمر السيد', username: 'omar.sayed' },
    { name: 'سارة القاضي', username: 'sarah.qadi' },
    { name: 'يوسف العبداللات', username: 'yousef.lat' },
    { name: 'فرح الشوابكة', username: 'farah.shawabkeh' },
    { name: 'حمزة الرواشدة', username: 'hamza.rawashdeh' },
    { name: 'دانيا المعايطة', username: 'dania.maayteh' },
    { name: 'كريم الدباس', username: 'kareem.dabbas' },
    { name: 'جنى الطراونة', username: 'jana.tarawneh' },
    { name: 'محمود الفايز', username: 'mahmoud.fayez' },
    { name: 'سلمى العجلوني', username: 'salma.ajlouni' },
    { name: 'فيصل المجالي', username: 'faisal.majali' },
    { name: 'مريم حدادين', username: 'maryam.haddadin' },
    { name: 'راشد الزبن', username: 'rashed.zeben' },
    { name: 'تالا النسور', username: 'tala.nsoor' },
    { name: 'حازم الحديد', username: 'hazem.hadeed' },
    { name: 'يارا خريس', username: 'yara.khreis' },
    { name: 'سامي الدويري', username: 'sami.dweiri' },
    { name: 'رند البخيت', username: 'rand.bakhit' },
    { name: 'جمال الصمادي', username: 'jamal.smadi' },
    { name: 'ديما الهنداوي', username: 'dima.hendawi' },
  ];

  const students10BData = [
    { name: 'زيد النابلسي', username: 'zaid.nabulsi' },
    { name: 'نور الهدى الكردي', username: 'nour.kurdi' },
    { name: 'بشار الزعبي', username: 'bashar.zoubi' },
    { name: 'آية المناصير', username: 'aya.manaseer' },
    { name: 'غيث الخصاونة', username: 'ghaith.khasawneh' },
    { name: 'شهد الحباشنة', username: 'shahd.habashneh' },
    { name: 'طارق غنيمات', username: 'tareq.ghneimat' },
    { name: 'هند العبادي', username: 'hind.abbadi' },
    { name: 'إبراهيم الكلوب', username: 'ibrahim.kloob' },
    { name: 'ريم البطاينة', username: 'reem.batayneh' },
    { name: 'عمار بني هاني', username: 'ammar.banihani' },
    { name: 'لانا القيسي', username: 'lana.qaisi' },
    { name: 'عبدالله الروسان', username: 'abdullah.rousan' },
    { name: 'مايا الصعوب', username: 'maya.sooub' },
    { name: 'معتز العبيدي', username: 'motaz.obeidi' },
    { name: 'سيرين الداوود', username: 'sireen.daoud' },
    { name: 'حسام العموش', username: 'hussam.amoush' },
    { name: 'راية الشمايلة', username: 'raya.shamayleh' },
    { name: 'أنس الملكاوي', username: 'anas.malkawi' },
    { name: 'ليان التميمي', username: 'layan.tamimi' },
  ];

  const students11AData = [
    { name: 'لين الحسيني', username: 'leen.husseini' },
    { name: 'علي العساف', username: 'ali.assaf' },
    { name: 'منى الجازي', username: 'mona.jazi' },
    { name: 'جاد قعوار', username: 'jad.qawar' },
    { name: 'حلا الردايدة', username: 'hala.rdaydeh' },
    { name: 'يزن الحنيطي', username: 'yazan.hneiti' },
    { name: 'ندى الشمايلة', username: 'nada.shamayleh' },
    { name: 'خالد الرفاعي', username: 'khaled.rifai' },
    { name: 'رزان البستنجي', username: 'razan.bustanji' },
    { name: 'سيف الدين قاسم', username: 'saif.qasim' },
    { name: 'بيسان قنديل', username: 'bisan.qandil' },
    { name: 'محمد صوالحة', username: 'mohammad.sawalha' },
    { name: 'دينا الهلسة', username: 'dina.halsa' },
    { name: 'فادي الساكت', username: 'fadi.saket' },
    { name: 'ميرا التل', username: 'mira.tall' },
    { name: 'باسم القاسم', username: 'bassem.qasim' },
    { name: 'رغد الزواهرة', username: 'raghad.zawahreh' },
    { name: 'أسامة النمري', username: 'osama.namari' },
    { name: 'جود العوران', username: 'joud.ouran' },
    { name: 'وليد العطيات', username: 'waleed.ateyat' },
  ];

  const created10AStudents = [];
  for (const s of students10AData) {
    const student = await prisma.user.create({
      data: {
        name: s.name,
        username: s.username,
        role: 'STUDENT',
        classId: class10A.id,
        passwordHash: commonStudentPassword,
      },
    });
    created10AStudents.push(student);
  }

  for (const s of students10BData) {
    await prisma.user.create({
      data: {
        name: s.name,
        username: s.username,
        role: 'STUDENT',
        classId: class10B.id,
        passwordHash: commonStudentPassword,
      },
    });
  }

  for (const s of students11AData) {
    await prisma.user.create({
      data: {
        name: s.name,
        username: s.username,
        role: 'STUDENT',
        classId: class11A.id,
        passwordHash: commonStudentPassword,
      },
    });
  }

  // 5. Create Quiz 1: Arabic Math Quiz (Negative marking OFF, 15 Questions)
  console.log('Creating Quiz 1: Arabic Math Quiz (Open, 15 Questions, Negative Marking OFF)...');
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const quiz1 = await prisma.quiz.create({
    data: {
      title: 'اختبار الرياضيات الأسبوعي: الجبر والمعادلات الخطية',
      language: 'ar',
      timeLimitMinutes: 20,
      opensAt: twoDaysAgo,
      closesAt: fiveDaysLater,
      negativeMarking: false,
      penaltyPercent: 0,
      createdById: teacherAhmad.id,
      classes: {
        create: [
          { classId: class10A.id },
          { classId: class10B.id },
        ],
      },
    },
  });

  const mathQuestionsData = [
    { text: 'ما هو حل المعادلة الخطية: 2س + 6 = 16؟', points: 1.0, options: ['س = 5', 'س = 4', 'س = 6', 'س = 8'], correctIdx: 0 },
    { text: 'إذا كان س = 3، فما هي قيمة المقدار: 4س² - 5س + 2؟', points: 2.0, options: ['23', '20', '29', '18'], correctIdx: 0 },
    { text: 'ما هو ميل الخط المستقيم المار بالنقطتين (2، 3) و (4، 7)؟', points: 1.0, options: ['2', '3', '4', '1/2'], correctIdx: 0 },
    { text: 'حل المتباينة: 3س - 4 < 8 هو:', points: 1.0, options: ['س < 4', 'س > 4', 'س ≤ 4', 'س < 2'], correctIdx: 0 },
    { text: 'ما هو العامل المشترك الأكبر للمقدارين: 12س² و 18س؟', points: 2.0, options: ['6س', '3س', '6س²', '12س'], correctIdx: 0 },
    { text: 'تحليل الفرق بين مربعين للمقدار: س² - 49 هو:', points: 1.0, options: ['(س - 7)(س + 7)', '(س - 7)²', '(س + 7)²', '(س - 49)(س + 1)'], correctIdx: 0 },
    { text: 'إذا كان محيط مستطيل 30 سم وطوله يزيد عن عرضه بمقدار 3 سم، فما هو عرضه؟', points: 3.0, options: ['6 سم', '9 سم', '7 سم', '5 سم'], correctIdx: 0 },
    { text: 'أي من النقاط التالية تقع على المستقيم: ص = 3س - 2؟', points: 1.0, options: ['(2، 4)', '(1، 3)', '(0، 2)', '(3، 5)'], correctIdx: 0 },
    { text: 'ما هو مجموع قياسات الزوايا الداخلية للشكل الرباعي؟', points: 1.0, options: ['360 درجة', '180 درجة', '540 درجة', '720 درجة'], correctIdx: 0 },
    { text: 'حل نظام المعادلتين: س + ص = 10 و س - ص = 4 هو:', points: 2.0, options: ['س = 7 ، ص = 3', 'س = 6 ، ص = 4', 'س = 8 ، ص = 2', 'س = 5 ، ص = 5'], correctIdx: 0 },
    { text: 'ما هي المساحة الإجمالية لمثلث طول قاعدته 8 سم وارتفاعه 5 سم؟', points: 1.0, options: ['20 سم²', '40 سم²', '13 سم²', '25 سم²'], correctIdx: 0 },
    { text: 'إذا كانت النسبة بين قياسي زاويتين متكاملتين 2 : 3، فما قياس الزاوية الصغرى؟', points: 3.0, options: ['72 درجة', '108 درجات', '60 درجة', '45 درجة'], correctIdx: 0 },
    { text: 'ما هو ناتج تبسيط: (2س³)² ؟', points: 1.0, options: ['4س⁶', '2س⁶', '4س⁵', '8س⁶'], correctIdx: 0 },
    { text: 'جذر المعادلة: س² - 5س + 6 = 0 هما:', points: 2.0, options: ['2 و 3', '-2 و -3', '1 و 6', '-1 و -6'], correctIdx: 0 },
    { text: 'مستودع يحتوي على 120 صندوقاً، إذا بِيع منه 35%، كم صندوقاً تبقى؟', points: 3.0, options: ['78 صندوقاً', '42 صندوقاً', '85 صندوقاً', '70 صندوقاً'], correctIdx: 0 },
  ];

  for (let i = 0; i < mathQuestionsData.length; i++) {
    const qData = mathQuestionsData[i];
    const question = await prisma.question.create({
      data: {
        quizId: quiz1.id,
        text: qData.text,
        points: qData.points,
        order: i + 1,
      },
    });

    for (let optIdx = 0; optIdx < qData.options.length; optIdx++) {
      await prisma.option.create({
        data: {
          questionId: question.id,
          text: qData.options[optIdx],
          isCorrect: optIdx === qData.correctIdx,
          order: optIdx + 1,
        },
      });
    }
  }

  // 6. Create Quiz 2: English Science Quiz (Negative marking ON 25%, 15 Questions)
  console.log('Creating Quiz 2: English Science Quiz (Open, 15 Questions, Negative Marking 25%)...');
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const sixDaysLater = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

  const quiz2 = await prisma.quiz.create({
    data: {
      title: 'Grade 11 Periodic Assessment: Cellular Biology & Genetics',
      language: 'en',
      timeLimitMinutes: 20,
      opensAt: oneDayAgo,
      closesAt: sixDaysLater,
      negativeMarking: true,
      penaltyPercent: 25,
      createdById: teacherRania.id,
      classes: {
        create: [{ classId: class11A.id }],
      },
    },
  });

  const scienceQuestionsData = [
    { text: 'Which cellular organelle is responsible for synthesizing ATP via aerobic respiration?', points: 1.0, options: ['Mitochondria', 'Golgi Apparatus', 'Endoplasmic Reticulum', 'Lysosome'], correctIdx: 0 },
    { text: 'During which phase of meiosis does crossing over between homologous chromosomes occur?', points: 2.0, options: ['Prophase I', 'Metaphase I', 'Anaphase II', 'Telophase I'], correctIdx: 0 },
    { text: 'What is the complementary DNA base pair for Adenine in double-stranded DNA?', points: 1.0, options: ['Thymine', 'Cytosine', 'Guanine', 'Uracil'], correctIdx: 0 },
    { text: 'Which enzyme unwinds the double helix structure during DNA replication?', points: 2.0, options: ['DNA Helicase', 'DNA Polymerase', 'RNA Primase', 'Ligase'], correctIdx: 0 },
    { text: 'An organism with genotype Rr is crossed with another Rr. What is the phenotypic ratio for a dominant-recessive trait?', points: 2.0, options: ['3:1', '1:2:1', '9:3:3:1', '1:1'], correctIdx: 0 },
    { text: 'Which macromolecule contains peptide bonds holding its monomer subunits together?', points: 1.0, options: ['Protein', 'Polysaccharide', 'Lipid', 'Nucleic Acid'], correctIdx: 0 },
    { text: 'What happens to a red blood cell placed in a strongly hypertonic sodium chloride solution?', points: 3.0, options: ['It crenates (shrivels due to water loss)', 'It lyses (bursts due to water influx)', 'It maintains constant volume', 'It doubles in size'], correctIdx: 0 },
    { text: 'Which pigment molecule is the primary electron donor in Photosystem II reaction centers?', points: 2.0, options: ['Chlorophyll a (P680)', 'Carotenoid', 'Chlorophyll b', 'Anthocyanin'], correctIdx: 0 },
    { text: 'What type of genetic mutation results from an insertion or deletion of a nucleotide that shifts the codon reading frame?', points: 2.0, options: ['Frameshift mutation', 'Silent mutation', 'Missense mutation', 'Neutral substitution'], correctIdx: 0 },
    { text: 'In cellular respiration, what is the net yield of ATP produced per glucose molecule during glycolysis?', points: 1.0, options: ['2 ATP', '4 ATP', '32 ATP', '36 ATP'], correctIdx: 0 },
    { text: 'Which blood type is considered the universal erythrocyte donor for ABO antigens?', points: 1.0, options: ['O negative', 'AB positive', 'A positive', 'B negative'], correctIdx: 0 },
    { text: 'What is the function of the ribosome during the process of translation?', points: 2.0, options: ['Catalyzing peptide bond formation between amino acids', 'Transcribing mRNA from DNA templates', 'Splicing pre-mRNA introns', 'Packaging proteins for vesicle secretion'], correctIdx: 0 },
    { text: 'If a diploid cell has 46 chromosomes, how many chromosomes are present in its haploid gametes?', points: 1.0, options: ['23', '46', '92', '12'], correctIdx: 0 },
    { text: 'Which law of Mendelian genetics states that alleles for different traits segregate independently during gamete formation?', points: 2.0, options: ['Law of Independent Assortment', 'Law of Segregation', 'Law of Dominance', 'Law of Linked Inheritance'], correctIdx: 0 },
    { text: 'Calculate the total magnification of a compound microscope using a 10x eyepiece and a 40x high-power objective lens:', points: 3.0, options: ['400x', '50x', '4000x', '4x'], correctIdx: 0 },
  ];

  for (let i = 0; i < scienceQuestionsData.length; i++) {
    const qData = scienceQuestionsData[i];
    const question = await prisma.question.create({
      data: {
        quizId: quiz2.id,
        text: qData.text,
        points: qData.points,
        order: i + 1,
      },
    });

    for (let optIdx = 0; optIdx < qData.options.length; optIdx++) {
      await prisma.option.create({
        data: {
          questionId: question.id,
          text: qData.options[optIdx],
          isCorrect: optIdx === qData.correctIdx,
          order: optIdx + 1,
        },
      });
    }
  }

  // 7. Create Quiz 3: Closed Past Quiz with completed attempts & varied scores
  console.log('Creating Quiz 3: Closed Past Quiz (Completed attempts & varied scores)...');
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const quiz3 = await prisma.quiz.create({
    data: {
      title: 'اختبار الفيزياء التقييمي: الحركة والقوة وقوانين نيوتن (مغلق)',
      language: 'ar',
      timeLimitMinutes: 20,
      opensAt: eightDaysAgo,
      closesAt: yesterday,
      negativeMarking: true,
      penaltyPercent: 25,
      createdById: teacherAhmad.id,
      classes: {
        create: [{ classId: class10A.id }],
      },
    },
  });

  const physicsQuestionsData = [
    { text: 'ما هي وحدة قياس القوة في النظام الدولي للوحدات (SI)؟', points: 1.0, options: ['نيوتن', 'جول', 'واط', 'باسكال'], correctIdx: 0 },
    { text: 'جسم كتلته 5 كغم يتسارع بمقدار 3 م/ث²، ما مقدار القوة المؤثرة عليه؟', points: 2.0, options: ['15 نيوتن', '8 نيوتن', '1.67 نيوتن', '45 نيوتن'], correctIdx: 0 },
    { text: 'ينص قانون نيوتن الأول في الحركة على أن الجسم الساكن يبقى ساكناً ما لم تؤثر عليه:', points: 1.0, options: ['قوة محصلة خارجية', 'قوة جاذبية فقط', 'طاقة حرارية', 'سرعة متجهة'], correctIdx: 0 },
    { text: 'ما هو التسارع المركزي لجسم يتحرك بسرعة 4 م/ث في مسار دائري نصف قطره 2 م؟', points: 2.0, options: ['8 م/ث²', '2 م/ث²', '16 م/ث²', '4 م/ث²'], correctIdx: 0 },
    { text: 'سقط حجر سقوطاً حراً من السكون، كم تبلغ سرعته بعد 3 ثوانٍ؟ (تسارع السقوط الحر = 9.8 م/ث²)', points: 2.0, options: ['29.4 م/ث', '9.8 م/ث', '19.6 م/ث', '44.1 م/ث'], correctIdx: 0 },
    { text: 'ما مقدار الشغل المبذول عند رفع صندوق كتلته 10 كغم رأسياً إلى ارتفاع 2 متر؟ (جـ = 9.8 م/ث²)', points: 3.0, options: ['196 جول', '20 جول', '98 جول', '49 جول'], correctIdx: 0 },
    { text: 'الكمية القياسية من بين الكميات الفيزيائية التالية هي:', points: 1.0, options: ['الكتلة', 'القوة', 'السرعة المتجهة', 'التسارع'], correctIdx: 0 },
    { text: 'إذا أثرت قوة فعل مقدارها 50 نيوتن على جدار، فما مقدار قوة رد الفعل؟', points: 1.0, options: ['50 نيوتن بالاتجاه المعاكس', '0 نيوتن لأن الجدار ثابت', '100 نيوتن', '25 نيوتن'], correctIdx: 0 },
    { text: 'النسبة بين التغير في السرعة والتغير في الزمن تُعرَّف بـ:', points: 1.0, options: ['التسارع', 'السرعة المتوسطة', 'الإزاحة', 'الزخم'], correctIdx: 0 },
    { text: 'ما هو زخم جسم كتلته 2 كغم يتحرك بسرعة 6 م/ث؟', points: 2.0, options: ['12 كغم.م/ث', '3 كغم.م/ث', '8 كغم.م/ث', '36 كغم.م/ث'], correctIdx: 0 },
    { text: 'الطاقة الحركية لجسم تعتمد طردياً على:', points: 1.0, options: ['مربع سرعته وكتلته', 'سرعته فقط', 'ارتفاعه عن الأرض', 'تسارعه'], correctIdx: 0 },
    { text: 'قوة الاحتكاك الحركي تكون دائماً في اتجاه:', points: 1.0, options: ['معاكس لاتجاه الحركة', 'مماثل لاتجاه الحركة', 'عمودي على الحركة', 'لا اتجاه محدد لها'], correctIdx: 0 },
    { text: 'إذا تضاعفت سرعة سيارة، فإن طاقتها الحركية تتضاعف بمقدار:', points: 2.0, options: ['4 أضعاف', 'ضعفين', '8 أضعاف', 'تبقى ثابتة'], correctIdx: 0 },
    { text: 'ما مقدار وزن جسم كتلته 70 كغم على سطح القمر؟ (جاذبية القمر = 1.6 م/ث²)', points: 2.0, options: ['112 نيوتن', '700 نيوتن', '43.75 نيوتن', '686 نيوتن'], correctIdx: 0 },
    { text: 'السطح المائل يقلل من مقدار:', points: 2.0, options: ['القوة اللازمة لرفع الجسم', 'الشغل الكلي المبذول', 'طاقة الوضع المكتسبة', 'الارتفاع الرأسي'], correctIdx: 0 },
  ];

  const quiz3CreatedQuestions = [];
  for (let i = 0; i < physicsQuestionsData.length; i++) {
    const qData = physicsQuestionsData[i];
    const q = await prisma.question.create({
      data: {
        quizId: quiz3.id,
        text: qData.text,
        points: qData.points,
        order: i + 1,
      },
    });

    const opts = [];
    for (let optIdx = 0; optIdx < qData.options.length; optIdx++) {
      const opt = await prisma.option.create({
        data: {
          questionId: q.id,
          text: qData.options[optIdx],
          isCorrect: optIdx === qData.correctIdx,
          order: optIdx + 1,
        },
      });
      opts.push(opt);
    }
    quiz3CreatedQuestions.push({ ...q, options: opts });
  }

  // Seed realistic completed attempts for 12 students in 10A
  console.log('Seeding 12 completed attempts with varied scores for Quiz 3...');
  const maxPhysicsScore = physicsQuestionsData.reduce((acc, q) => acc + q.points, 0); // 24 points

  // Vary performance per student: high performers, average, low
  const studentPerformances = [
    { studentIdx: 0, correctRate: 0.95 }, // Omar Sayed (high)
    { studentIdx: 1, correctRate: 0.90 }, // Sarah Qadi (high)
    { studentIdx: 2, correctRate: 0.80 }, // Yousef
    { studentIdx: 3, correctRate: 0.75 }, // Farah
    { studentIdx: 4, correctRate: 0.70 }, // Hamza
    { studentIdx: 5, correctRate: 0.65 }, // Dania
    { studentIdx: 6, correctRate: 0.60 }, // Kareem
    { studentIdx: 7, correctRate: 0.55 }, // Jana
    { studentIdx: 8, correctRate: 0.50 }, // Mahmoud
    { studentIdx: 9, correctRate: 0.40 }, // Salma
    { studentIdx: 10, correctRate: 0.35 }, // Faisal
    { studentIdx: 11, correctRate: 0.20 }, // Maryam (low, testing negative marking floor)
  ];

  for (const perf of studentPerformances) {
    const student = created10AStudents[perf.studentIdx];
    const startedAt = new Date(eightDaysAgo.getTime() + 2 * 60 * 60 * 1000 + perf.studentIdx * 45 * 60 * 1000);
    const submittedAt = new Date(startedAt.getTime() + 18 * 60 * 1000); // took 18 minutes

    let earnedScore = 0;
    const studentAnswersData: Array<{ questionId: string; selectedOptionId: string }> = [];

    for (let qIdx = 0; qIdx < quiz3CreatedQuestions.length; qIdx++) {
      const q = quiz3CreatedQuestions[qIdx];
      const isCorrect = (qIdx / quiz3CreatedQuestions.length) < perf.correctRate;
      const selectedOpt = isCorrect
        ? q.options.find((o) => o.isCorrect)!
        : q.options.find((o) => !o.isCorrect) || q.options[1];

      studentAnswersData.push({
        questionId: q.id,
        selectedOptionId: selectedOpt.id,
      });

      if (isCorrect) {
        earnedScore += q.points;
      } else {
        // 25% negative marking
        earnedScore -= q.points * 0.25;
      }
    }

    const finalScore = Math.max(0, Math.round(earnedScore * 100) / 100);

    const attempt = await prisma.attempt.create({
      data: {
        studentId: student.id,
        quizId: quiz3.id,
        startedAt,
        deadlineAt: new Date(startedAt.getTime() + 20 * 60 * 1000),
        submittedAt,
        score: finalScore,
        maxScore: maxPhysicsScore,
        status: 'SUBMITTED',
      },
    });

    for (const ans of studentAnswersData) {
      await prisma.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: ans.questionId,
          selectedOptionId: ans.selectedOptionId,
        },
      });
    }
  }

  // 8. Create Quiz 4: Upcoming Quiz (Opens in 3 days)
  console.log('Creating Quiz 4: Upcoming Quiz (Not yet open)...');
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const quiz4 = await prisma.quiz.create({
    data: {
      title: 'الاختبار التجريبي الشامل لمنتصف الفصل الدراسي (قريباً)',
      language: 'ar',
      timeLimitMinutes: 25,
      opensAt: inThreeDays,
      closesAt: inTenDays,
      negativeMarking: false,
      penaltyPercent: 0,
      createdById: teacherTareq.id,
      classes: {
        create: [
          { classId: class10A.id },
          { classId: class10B.id },
          { classId: class11A.id },
        ],
      },
    },
  });

  // Seed 15 questions for upcoming quiz
  for (let i = 1; i <= 15; i++) {
    const q = await prisma.question.create({
      data: {
        quizId: quiz4.id,
        text: `سؤال المراجعة العامة رقم ${i}: ما هو التطبيق العملي للمفهوم العلمي المدروس في الوحدة ${Math.ceil(i / 3)}؟`,
        points: (i % 3 === 0) ? 3.0 : (i % 2 === 0 ? 2.0 : 1.0),
        order: i,
      },
    });

    for (let opt = 1; opt <= 4; opt++) {
      await prisma.option.create({
        data: {
          questionId: q.id,
          text: `الخيار التدريبي رقم (${opt}) للسؤال ${i}`,
          isCorrect: opt === 1,
          order: opt,
        },
      });
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log('Summary of seeded records:');
  console.log(`- 1 Admin: username: nour | password: Password123!`);
  console.log(`- 4 Teachers: ahmad.khatib, rania.zoubi, tareq.haddad, mona.majali | password: Password123!`);
  console.log(`- 3 Classes: 10A, 10B, 11A`);
  console.log(`- 60 Students (~20/class): e.g. omar.sayed (10A), zaid.nabulsi (10B), leen.husseini (11A) | password: Student123!`);
  console.log(`- 4 Quizzes:`);
  console.log(`  1. Arabic Math Quiz (Open, Negative Marking OFF, 15 Qs)`);
  console.log(`  2. English Science Quiz (Open, Negative Marking ON 25%, 15 Qs)`);
  console.log(`  3. Physics Quiz (Closed, 12 completed attempts with varied scores)`);
  console.log(`  4. Mid-term Review Quiz (Upcoming, opens in 3 days)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
