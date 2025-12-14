import express from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs'; // Standard naming
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());


app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
        data: { email, password: hashedPassword }
    });

    res.json({ message: "User registered successfully" });
  
});


 app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
     if (!user) return res.status(404).send("User not found");
    
     const isValid = await bcrypt.compare(password, user.password);
     if (!isValid) return res.status(401).send("Invalid password");

    const token = jwt.sign({ id: user.id }, "SUPER_SECRET_KEY");
    res.json({ token });
  
 });


 function authMiddleware(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send("Access denied.");

    jwt.verify(token, "SUPER_SECRET_KEY", (err, decodedUser) => {
        if (err) return res.status(403).send("Invalid token");
        req.user = decodedUser; // Attaching user to request
        next();
    });
}


 app.get('/todos', authMiddleware, async (req, res) => { 
    const todos = await prisma.todo.findMany({
        where: { userId: req.user.id }
    });
    res.json(todos);
});


app.post('/todos', authMiddleware, async (req, res) => {
    const { task } = req.body;
    if (!task) return res.status(400).send({ message: "Task is required" });

    
      const newTodo = await prisma.todo.create({
        data: {
            task,
            userId: req.user.id 
        }
    });
    res.json(newTodo);
});


app.delete('/todos/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    await prisma.todo.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Todo deleted successfully" });
});

app.get('/todos/:id/clone', authMiddleware, async (req,res)=>{
    const id = req.params.id;
    const originalTodo = await prisma.todo.findUnique({where: {id: parseInt(id)}});
    if(!originalTodo) return res.status(404).send({message: "Todo not found"});

    const clonedTodo = await prisma.todo.create({
        data: {
            task: originalTodo.task,
            userId: req.user.id
        }
    });
    res.json(clonedTodo);
})

app.listen(3000, () => console.log("Server running on port 3000"));