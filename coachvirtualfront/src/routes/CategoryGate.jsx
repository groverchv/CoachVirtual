import { Navigate, Outlet } from "react-router-dom";
import { useCategory } from "../context/CategoryContext";

export default function CategoryGate() {
  const { category } = useCategory();
  if (!category) return <Navigate to="/seleccionar" replace />;
  return <Outlet />;
}
