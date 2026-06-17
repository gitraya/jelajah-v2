export const getTripStatusColor = (status: string) =>
  ({
    PLANNING: "bg-blue-100 text-blue-800",
    ONGOING: "bg-green-100 text-green-800",
    COMPLETED: "bg-gray-100 text-gray-800",
  }[status] || "bg-gray-100 text-gray-800");

export const getTripDifficultyColor = (difficulty: string) =>
  ({
    EASY: "bg-green-100 text-green-800",
    MODERATE: "bg-yellow-100 text-yellow-800",
    CHALLENGING: "bg-red-100 text-red-800",
  }[difficulty] || "bg-gray-100 text-gray-800");

export const getItineraryPriorityColor = (priority: string) =>
  ({
    HIGH: "bg-red-100 text-red-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    LOW: "bg-green-100 text-green-800",
  }[priority] || "bg-gray-100 text-gray-800");

export const getExpenseCategoryColor = (category: string) =>
  ({
    Accommodation: "bg-blue-100 text-blue-800",
    Transportation: "bg-green-100 text-green-800",
    Food: "bg-orange-100 text-orange-800",
    Activities: "bg-purple-100 text-purple-800",
    Shopping: "bg-pink-100 text-pink-800",
    Other: "bg-gray-100 text-gray-800",
  }[category] || "bg-gray-100 text-gray-800");

export const getMapTypeColor = (type: string) =>
  ({
    Cultural: "bg-purple-100 text-purple-800",
    Nature: "bg-green-100 text-green-800",
    Beach: "bg-blue-100 text-blue-800",
    Restaurant: "bg-orange-100 text-orange-800",
    Shopping: "bg-pink-100 text-pink-800",
    Activity: "bg-yellow-100 text-yellow-800",
    Other: "bg-gray-100 text-gray-800",
  }[type] || "bg-gray-100 text-gray-800");

export const getMapStatusColor = (status: string) =>
  ({
    PLANNED: "bg-blue-100 text-blue-800",
    VISITED: "bg-green-100 text-green-800",
    SKIPPED: "bg-gray-100 text-gray-800",
  }[status] || "bg-gray-100 text-gray-800");

export const getMemberStatusColor = (status: string) =>
  ({
    ACCEPTED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    DECLINED: "bg-red-100 text-red-800",
  }[status] || "bg-gray-100 text-gray-800");

export const getMemberRoleColor = (role: string) =>
  ({
    ORGANIZER: "bg-purple-100 text-purple-800",
    CO_ORGANIZER: "bg-blue-100 text-blue-800",
    MEMBER: "bg-gray-100 text-gray-800",
  }[role] || "bg-gray-100 text-gray-800");

export const getPackingCategoryColor = (category: string) =>
  ({
    Documents: "bg-red-100 text-red-800",
    Clothing: "bg-blue-100 text-blue-800",
    Toiletries: "bg-green-100 text-green-800",
    Electronics: "bg-purple-100 text-purple-800",
    "Beach gear": "bg-cyan-100 text-cyan-800",
    Medical: "bg-orange-100 text-orange-800",
    Other: "bg-gray-100 text-gray-800",
  }[category] || "bg-gray-100 text-gray-800");
