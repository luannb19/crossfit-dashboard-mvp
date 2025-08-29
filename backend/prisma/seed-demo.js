// prisma/seed-demo.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = (arr, n) => arr.slice().sort(() => 0.5 - Math.random()).slice(0, n);

// garante pelo menos N alunos
async function ensureStudents(min = 30) {
  const existing = await prisma.user.findMany({
    where: { role: 'ALUNO' },
    select: { id: true, email: true, name: true },
  });
  const need = Math.max(0, min - existing.length);
  if (need > 0) {
    const data = Array.from({ length: need }).map((_, i) => ({
      email: `aluno.seed${i + 1}@insightflow.com`,
      role: 'ALUNO',
      name: `Aluno Seed ${i + 1}`,
      // remova "password" se seu schema não tiver esse campo
    }));
    await prisma.user.createMany({ data, skipDuplicates: true });
  }
  return prisma.user.findMany({ where: { role: 'ALUNO' }, select: { id: true } });
}

// cria aulas diárias em horários fixos se faltarem
async function ensureClasses(daysBack = 21, hours = [10, 18, 21], capacity = 20) {
  const now = new Date();
  const from = new Date();
  from.setDate(now.getDate() - daysBack);

  const existing = await prisma.class.findMany({
    where: { startAt: { gte: from, lte: now } },
    select: { id: true, startAt: true },
  });

  const existingKey = new Set(existing.map(c => {
    const d = new Date(c.startAt);
    return d.toISOString().slice(0,10) + '-' + d.getUTCHours();
    // chave YYYY-MM-DD-HH para evitar duplicar o mesmo slot
  }));

  const toCreate = [];
  for (let d = new Date(from); d <= now; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const dayStr = day.toISOString().slice(0,10);
    for (const hr of hours) {
      const key = `${dayStr}-${hr}`;
      if (existingKey.has(key)) continue;
      const startAt = new Date(`${dayStr}T${String(hr).padStart(2,'0')}:00:00.000Z`);
      const endAt = new Date(startAt); endAt.setHours(endAt.getHours() + 1);
      toCreate.push({ title: `WOD ${hr}h`, startAt, endAt, capacity });
    }
  }
  if (toCreate.length) await prisma.class.createMany({ data: toCreate });

  return prisma.class.findMany({
    where: { startAt: { gte: from, lte: now } },
    select: { id: true, startAt: true, capacity: true, title: true },
    orderBy: { startAt: 'asc' }
  });
}

// cria presenças com ocupação ~30–90%
async function seedAttendances(students, classes) {
  let created = 0;
  for (const c of classes) {
    const already = await prisma.attendance.count({ where: { classId: c.id } });
    const target = Math.min(
      c.capacity,
      Math.max(1, Math.floor(c.capacity * (0.3 + Math.random() * 0.6)))
    );
    const need = Math.max(0, target - already);
    if (!need) continue;

    const chosen = sample(students, need);
    for (const s of chosen) {
      try {
        await prisma.attendance.create({
          data: { userId: s.id, classId: c.id, attendedAt: c.startAt }
        });
        created++;
      } catch { /* ignora duplicada */ }
    }
  }
  return created;
}

async function main() {
  console.log('> Garantindo alunos…');
  const students = await ensureStudents(30);

  console.log('> Garantindo aulas nos últimos 21 dias…');
  const classes = await ensureClasses(21, [10,18,21], 20);

  console.log(`> Temos ${students.length} alunos e ${classes.length} aulas.`);
  console.log('> Gerando presenças…');
  const created = await seedAttendances(students, classes);
  console.log(`✅ Seed concluído: ${created} presenças criadas/garantidas.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
