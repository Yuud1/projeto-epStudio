import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    name: "Administrador",
    email: "admin@epstudio.local",
    password: "Admin@123",
    role: UserRole.ADMIN,
  },
  {
    name: "Gerente da Loja",
    email: "gerente@epstudio.local",
    password: "Gerente@123",
    role: UserRole.REQUESTER,
  },
  {
    name: "Gerente de Marketing",
    email: "marketing@epstudio.local",
    password: "Marketing@123",
    role: UserRole.MARKETING_MANAGER,
  },
  {
    name: "Designer",
    email: "designer@epstudio.local",
    password: "Designer@123",
    role: UserRole.DESIGNER,
  },
  {
    name: "Criador de Conteúdo",
    email: "conteudo@epstudio.local",
    password: "Conteudo@123",
    role: UserRole.CONTENT_CREATOR,
  },
  {
    name: "Social Media",
    email: "social@epstudio.local",
    password: "Social@123",
    role: UserRole.SOCIAL_MEDIA,
  },
] as const;

async function main() {
  for (const user of users) {
    const passwordHash = await argon2.hash(user.password);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        active: true,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        active: true,
      },
    });
  }

  console.log(`Seed concluído: ${users.length} usuários de desenvolvimento prontos.`);
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
