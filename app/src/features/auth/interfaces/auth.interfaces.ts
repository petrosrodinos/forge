export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface UpdateProfileDto {
  email?: string;
  displayName?: string | null;
  currentPassword?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
