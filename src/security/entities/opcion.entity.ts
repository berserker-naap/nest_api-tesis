import { Audit } from 'src/common/entity/audit';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Modulo } from './modulo.entity';

@Entity('OPCION')
export class Opcion extends Audit {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Modulo, (modulo) => modulo.opciones)
    @JoinColumn({ name: 'idModulo' })
    modulo: Modulo;

    @Column({ type: 'nvarchar', length: 200 })
    nombre: string;

    @Column({ type: 'nvarchar', length: 200, unique: true, nullable: true })
    path: string | null;

    @Column({ default: true })
    isVisibleNavegacion: boolean;
}