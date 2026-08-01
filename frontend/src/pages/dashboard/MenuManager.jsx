import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";
import { useAuth } from "../../context/AuthContext";

export default function MenuManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["menu", restaurantId],
    queryFn: () => api.get(`/menu/${restaurantId}`).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const createCategory = useMutation({
    mutationFn: (data) =>
      api.post(`/menu/${restaurantId}/categories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["menu", restaurantId]);
      toast.success("Catégorie ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, ...data }) =>
      api.put(`/menu/${restaurantId}/categories/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries(["menu", restaurantId]),
  });

  const deleteCategory = useMutation({
    mutationFn: (id) => api.delete(`/menu/${restaurantId}/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["menu", restaurantId]);
      toast.success("Catégorie supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const createItem = useMutation({
    mutationFn: (data) => api.post(`/menu/${restaurantId}/items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["menu", restaurantId]);
      toast.success("Plat ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout du plat"),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, ...data }) =>
      api.put(`/menu/${restaurantId}/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["menu", restaurantId]);
      toast.success("Plat modifié");
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });

  const deleteItem = useMutation({
    mutationFn: (id) => api.delete(`/menu/${restaurantId}/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["menu", restaurantId]);
      toast.success("Plat supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const [newCatName, setNewCatName] = useState("");
  const [newItem, setNewItem] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: "",
    prepTimeMinutes: 15,
    photo: "",
  });
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    createCategory.mutate({ name: newCatName, order: menu.length });
    setNewCatName("");
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.categoryId) return;
    createItem.mutate({
      ...newItem,
      price: parseFloat(newItem.price),
      prepTimeMinutes: parseInt(newItem.prepTimeMinutes),
    });
    setNewItem({
      categoryId: newItem.categoryId,
      name: "",
      description: "",
      price: "",
      prepTimeMinutes: 15,
      photo: "",
    });
  };

  const handleToggleAvailable = (item) => {
    updateItem.mutate({ id: item._id, isAvailable: !item.isAvailable });
  };

  const handleEditItem = (item) => {
    setEditingItem(item._id);
    setEditForm({
      name: item.name,
      description: item.description,
      price: item.price,
      prepTimeMinutes: item.prepTimeMinutes,
      photo: item.photo || "",
    });
  };

  const handleSaveEdit = (itemId) => {
    updateItem.mutate({ id: itemId, ...editForm });
    setEditingItem(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestion du Menu</h1>

      {/* Create Category */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Ajouter une catégorie</h2>
        <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nom de la catégorie"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Ajouter
          </button>
        </form>
      </div>

      {/* Categories & Items */}
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : menu.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="Aucune catégorie"
          subtitle="Ajoute ta première catégorie de plats pour commencer"
        />
      ) : (
        menu.map((cat) => (
        <div key={cat._id} className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-lg">{cat.name}</h2>
            <button
              onClick={() => {
                if (confirm("Supprimer cette catégorie et tous ses plats ?")) {
                  deleteCategory.mutate(cat._id);
                }
              }}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Supprimer
            </button>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {cat.items?.map((item) => (
              <div
                key={item._id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {editingItem === item._id ? (
                  <div className="flex-1 flex gap-2 flex-wrap">
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="px-2 py-1 border rounded text-sm"
                      placeholder="Nom"
                    />
                    <input
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: parseFloat(e.target.value) })
                      }
                      type="number"
                      step="0.01"
                      className="w-20 px-2 py-1 border rounded text-sm"
                      placeholder="Prix"
                    />
                    <input
                      value={editForm.photo}
                      onChange={(e) =>
                        setEditForm({ ...editForm, photo: e.target.value })
                      }
                      className="flex-1 min-w-40 px-2 py-1 border rounded text-sm"
                      placeholder="Photo (URL)"
                    />
                    <button
                      onClick={() => handleSaveEdit(item._id)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span
                        className={`font-medium ${
                          item.isAvailable ? "text-gray-800" : "text-gray-400 line-through"
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.description && (
                        <p className="text-sm text-gray-500">{item.description}</p>
                      )}
                    </div>
                    {item.photo && (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="w-11 h-11 rounded-lg object-cover border border-gray-200"
                      />
                    )}
                    <span className="font-semibold text-gray-800">
                      {item.price.toFixed(2)} €
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.prepTimeMinutes}min
                    </span>
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      className={`px-2 py-1 text-xs rounded ${
                        item.isAvailable
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.isAvailable ? "Dispo" : "Indispo"}
                    </button>
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer ce plat ?")) {
                          deleteItem.mutate(item._id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            ))}
            {(!cat.items || cat.items.length === 0) && (
              <p className="text-gray-400 text-sm italic">Aucun plat</p>
            )}
          </div>

          {/* Add Item Form */}
          {newItem.categoryId === cat._id ? (
            <form onSubmit={handleCreateItem} className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Nom du plat"
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  required
                />
                <input
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  type="number"
                  step="0.01"
                  placeholder="Prix"
                  className="w-full sm:w-24 px-2 py-1 border rounded text-sm"
                  required
                />
                <input
                  value={newItem.prepTimeMinutes}
                  onChange={(e) =>
                    setNewItem({ ...newItem, prepTimeMinutes: e.target.value })
                  }
                  type="number"
                  placeholder="Min"
                  className="w-full sm:w-16 px-2 py-1 border rounded text-sm"
                />
              </div>
              <input
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
                placeholder="Description (optionnel)"
                className="w-full px-2 py-1 border rounded text-sm"
              />
              <input
                value={newItem.photo}
                onChange={(e) =>
                  setNewItem({ ...newItem, photo: e.target.value })
                }
                placeholder="Photo (URL, optionnel)"
                className="w-full px-2 py-1 border rounded text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewItem({
                      categoryId: "",
                      name: "",
                      description: "",
                      price: "",
                      prepTimeMinutes: 15,
                      photo: "",
                    })
                  }
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() =>
                setNewItem({ ...newItem, categoryId: cat._id })
              }
              className="mt-3 text-sm text-gray-600 hover:text-gray-900"
            >
              + Ajouter un plat
            </button>
          )}
          </div>
        ))
      )}
    </div>
  );
}
