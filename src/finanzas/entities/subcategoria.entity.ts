import { Audit } from 'src/common/entity/audit';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('SUBCATEGORIA')
export class Subcategoria extends Audit {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ type: 'nvarchar', length: 100 })
  nombre: string;
}