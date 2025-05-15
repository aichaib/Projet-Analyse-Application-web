// importer ler client prisma
import { PrismaClient } from "@prisma/client";

import bcrypt from "bcrypt";

//Creer une instance de prisma
const prisma = new PrismaClient();