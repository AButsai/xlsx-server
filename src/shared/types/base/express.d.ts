declare namespace Express {
  interface Request {
    rawBody?: Buffer;
    user?: import('../user.types').TUser;
  }
}
