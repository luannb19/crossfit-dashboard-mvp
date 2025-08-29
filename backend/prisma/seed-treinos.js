import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.treino.createMany({
    data: [
      { title: 'WOD Força', description: 'Agachamento, terra e desenvolvimento', publico: true },
      { title: 'WOD Metcon', description: 'AMRAP 20: KB swing, box jump, burpee', publico: true },
      { title: 'Técnica de Ginástica', description: 'Kipping, pull-up estrito, handstand hold', publico: false },
    ],
  });
  console.log('Treinos seed: OK');
}

main().finally(() => prisma.$disconnect());
