import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EntrepriseEntity } from './entreprise.entity';

@Entity('job_offers')
export class JobOfferEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @ManyToOne(() => EntrepriseEntity, (entreprise) => entreprise.jobOffers, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entreprise_id' })
  entreprise: EntrepriseEntity;

  @Column()
  titre: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 255 })
  localisation: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  type_de_contrat: string; 

  @Column({ type: 'text', nullable: true })
  salaire_brut: string; 

  @Column({ type: 'text', nullable: true })
  experience: string; 

  @Column({ type: 'text', nullable: true })
  occupation: string; 

  @Column({ type: 'text', nullable: true })
  competences: string;

  @Column({ type: 'text', nullable: true })
  savoir_etre: string;

  @Column({ type: 'text', nullable: true })
  formation: string;

  @Column({ type: 'text', nullable: true })
  qualite_pro: string; 

  @Column({ type: 'text', nullable: true })
  secteur_activite: string; 

  @Column({ type: 'text', nullable: true })
  specialite: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  duree_de_l_offre: string; 

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
