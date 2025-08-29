// prisma/seed-attendance.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// util
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = (arr, n) => arr.slice().sort(() => 0.5 - Math.random()).slice(0, n);

// cria alunos se não houver o suficiente
async function ensureStudents(min = 30) {
  const existing = await prisma.user.findMany({
    where: { role: 'ALUNO' },
    select: { id: true, email: true, name: true },
  });
  const need = Math.max(0, min - existing.length);
  if (need === 0) return existing;

  const toCreate = Array.from({ length: need }).map((_, i) => ({
    email: `aluno.seed${i + 1}@insightflow.com`,
    password: '$2a$10$X9m1r3PlcQbFhR8v9h9YEu2Q1m2GFnFakeHashForSeedOnly', // qualquer hash fake se o schema exigir
    role: 'ALUNO',
    name: `Aluno Seed ${i + 1}`,
  }));

  await prisma.user.createMany({ data: toCreate, skipDuplicates: true });
  return await prisma.user.findMany({ where: { role: 'ALUNO' }, select: { id: true, email: true, name: true } });
}

// cria aulas no range se faltar (3 horários/dia)
async function ensureClasses(daysBack = 21, hours = [10, 18, 21], capacity = 20) {
  const now = new Date();
  const from = new Date();
  from.setDate(now.getDate() - daysBack);

  // busca já existentes
  const existing = await prisma.class.findMany({
    where: { startAt: { gte: from, lte: now } },
    select: { id: true, startAt: true },
  });

  const existingKey = new Set(existing.map(c => {
    const d = new Date(c.startAt);
    return d.toISOString().slice(0,10) + '-' + d.getUTCHours();
  }));

  const toCreate = [];
  for (let d = new Date(from); d <= now; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const dayStr = day.toISOString().slice(0,10); // YYYY-MM-DD (UTC)
    for (const hr of hours) {
      const key = `${dayStr}-${hr}`;
      if (existingKey.has(key)) continue;

      const startAt = new Date(`${dayStr}T${String(hr).padStart(2,'0')}:00:00.000Z`);
      const endAt = new Date(startAt);
      endAt.setHours(endAt.getHours() + 1);

      toCreate.push({
        title: `WOD ${hr}h`,
        startAt,
        endAt,
        capacity,
      });
    }
  }

  if (toCreate.length) {
    await prisma.class.createMany({ data: toCreate });
  }

  return await prisma.class.findMany({
    where: { startAt: { gte: from, lte: now } },
    select: { id: true, startAt: true, capacity: true, title: true },
    orderBy: { startAt: 'asc' },
  });
}

// gera presenças com ocupação 30–90%
async function seedAttendances(students, classes) {
  let created = 0;

  for (const c of classes) {
    // presença já existente para a aula
    const already = await prisma.attendance.count({ where: { classId: c.id } });

    // alvo de ocupação (se já tem presenças, respeita e só complementa até o alvo)
    const target = Math.min(
      c.capacity,
      Math.max(1, Math.floor(c.capacity * (0.3 + Math.random() * 0.6)))
    );

    const need = Math.max(0, target - already);
    if (need === 0) continue;

    const chosen = sample(students, need);

    // cria uma por vez para evitar duplicidade por (userId,classId)
    for (const s of chosen) {
      try {
        await prisma.attendance.create({
          data: {
            userId: s.id,
            classId: c.id,
            attendedAt: c.startAt, // simples: usa o horário da aula
          },
        });
        created++;
      } catch (e) {
        // ignora duplicadas se existirem
      }
    }
  }

  return created;
}

async function main() {
  console.log('> Seed: preparando alunos…');
  const students = await ensureStudents(30);

  console.log('> Seed: preparando aulas…');
  const classes = await ensureClasses(21, [10, 18, 21], 20);

  console.log(`> Encontradas ${students.length} alunos e ${classes.length} aulas no período.`);
  console.log('> Seed: gerando presenças…');
  const created = await seedAttendances(students, classes);

  console.log(`✅ Seed concluído: ${created} presenças criadas/garantidas.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
