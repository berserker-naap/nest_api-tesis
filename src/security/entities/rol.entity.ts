import { Audit } from 'src/common/entity/audit';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ROL')
export class Rol extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  descripcion!: string | null;

}
