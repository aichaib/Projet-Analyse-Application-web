// importer ler client prisma
import { PrismaClient } from "@prisma/client";

import bcrypt from "bcrypt";

//Creer une instance de prisma
const prisma = new PrismaClient();

// Pour recuperer un utilisateur par son email
export const getUserByEmail = async (email) => {
    const user = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    return user;
};
