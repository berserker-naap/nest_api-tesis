import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Persona } from './persona.entity';
import { Audit } from 'src/common/entity/audit';
import { UsuarioRol } from './usuario-rol.entity';

@Entity('USUARIO')
export class Usuario extends Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  login!: string;

  @Column({ type: 'nvarchar', length: 255, nullable: false })
  password!: string;

  @ManyToOne(() => Persona)
  @JoinColumn({ name: 'idPersona' })
  persona!: Persona | null;

  @OneToMany(() => UsuarioRol, (usuarioRol) => usuarioRol.usuario)
  roles!: UsuarioRol[];
}
