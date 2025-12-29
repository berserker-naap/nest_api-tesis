import { Audit } from 'src/common/entity/audit';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('MULTITABLA')
export class Multitabla extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: true })
  idMultitabla: number;

  @Column({ type: 'nvarchar', length: 100 })
  nombre: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  valor: string | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  valor2: string | null;
}
