export class DoctorResponseDto {
  id: number;
  crm: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles: string[];
  };
}
