export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type SignupInput = {
  email: string;
  password: string;
  name?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ApiError = {
  error: string;
};
