import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { showConfirmDelete } from '../alerts'; // <-- Importamos tu alerta de confirmación
import { 
  Wrench, MapPin, Phone, Clock, PlayCircle, 
  CheckCircle2, AlertCircle, Building2, FileText, CheckCircle, Trash2
} from 'lucide-react';

export default function StaffServiceRequests({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating,