import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Rol } from './rol.entity';
import { Audit } from 'src/common/entity/audit';

@Entity('USUARIO_ROL')
export class UsuarioRol extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'idUsuario' })
  usuario: Usuario;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'idRol' })
  rol: Rol;

}
