import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EntrepriseEntity } from './entreprise.entity';
import { Index } from 'typeorm';
@Entity('job_offers')
@Index(['titre', 'entreprise'], { unique: true })
export class JobOfferEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @ManyToOne(() => EntrepriseEntity, (entreprise) => entreprise.id, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'entreprise_id' })
    entreprise: EntrepriseEntity;

    @Column()
    titre: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 255 })
  localisation: string;

  @Column({ type: 'enum', enum: ['CDI', 'CDD', 'intérim', 'saisonnier', 'stage', 'autres'], nullable: true })
  type_de_contrat: string;

  @Column({ type: 'enum', enum: ['salaire précis', 'fourchette salariale', 'non précisé'], nullable: true })
  salaire_brut: string;

  @Column({ type: 'enum', enum: ['sans experience', '1 à 3 ans', '3 à 5 ans', '5 à 10 ans', 'plus de 10 ans'], nullable: true })
  experience: string;

  @Column({ type: 'enum', enum: ['Full-time', 'flexible', 'Part-time'], nullable: true })
  occupation: string;

  @Column({ type: 'enum', enum: ['Diplôme d’état d’infirmier', 'bac+2', 'bac+3', 'bac+5', 'autre'], nullable: true })
  formation: string;

  @Column({ type: 'enum', enum: ['Réalisation des soins infirmiers', 'Gestion des patients chroniques', 'Assistance au bloc opératoire', 'autre'], nullable: true })
  competences: string;

  @Column({ type: 'enum', enum: ['empathie', 'travail en équipe', 'capacité d’écoute', 'rigueur et organisation'], nullable: true })
  savoir_etre: string;

  @Column({ type: 'enum', enum: ['technicien', 'cadre de santé', 'auxiliaire médical'], nullable: true })
  qualite_pro: string;

  @Column({ type: 'enum', enum: ['soins hospitaliers', 'maison de retraite', 'clinique privée', 'soins à domicile'], nullable: true })
  secteur_activite: string;

  @Column({ length: 255, nullable: true })
  specialite: string;

  @Column({ type: 'enum', enum: ['1 mois', '3 mois', 'jusqu’à fermeture'], nullable: true })
  duree_de_l_offre: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
