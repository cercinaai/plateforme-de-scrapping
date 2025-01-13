import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EntrepriseEntity } from './entreprise.entity';

@Entity('job_offers')
export class JobOfferEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => EntrepriseEntity, (entreprise) => entreprise.id, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entreprise_id' })
  entreprise: EntrepriseEntity;
  

  @Column()
  titre: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  localisation: string;

  @Column({ nullable: true })
  type_de_contrat: string;

  @Column({ nullable: true })
  salaire_brut: string;

  @Column('json', { nullable: true })
  competences: string[];

  @Column('json', { nullable: true })
  savoir_etre: string[];

  @Column({ nullable: true })
  specialite: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ nullable: true })
  experience: string;

  @Column({ nullable: true })
  formation: string;

  @Column({ nullable: true })
  qualite_pro: string;

  @Column({ nullable: true })
  secteur_activite: string;

  @Column({ nullable: true })
  duree_de_l_offre: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
