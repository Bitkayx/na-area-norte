export interface Horario {
  dias: string;
  horaInicio: string;
  horaFin: string;
}

export interface Direccion {
  linea1: string;
  colonia: string;
  referencias: string;
  ciudad: string;
  estado: string;
}

export interface Grupo {
  id: string;
  nombre: string;
  distrito: string;
  direccion: Direccion;
  horarios: Horario[];
  mapQuery: string;
}
