import { Restaurant, Product, RestaurantCategory, ProductCategory, sequelizeSession } from '../models/models.js'

/*
ADEMÁS, LOS RESTAURANTES PROMOCIONADOS APARECERÁN SIEMPRE AL PRINCIPIO DE LOS LISTADOS DE RESTAURANTES QUE SE LE PRESENTAN
TANTO A LOS DUEÑOS COMO A LOS CLIENTES.
*/
// SOLUCION
const index = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: { exclude: ['userId'] },
        include:
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      },
        order: [['promoted', 'DESC'], [{ model: RestaurantCategory, as: 'restaurantCategory' }, 'name', 'ASC']]
      }
    )
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUCION
const indexOwner = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: { exclude: ['userId'] },
        where: { userId: req.user.id },
        order: [['promoted', 'DESC']],
        include: [{
          model: RestaurantCategory,
          as: 'restaurantCategory'
        }]
      })
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

const create = async function (req, res) {
  const newRestaurant = Restaurant.build(req.body)
  newRestaurant.userId = req.user.id // usuario actualmente autenticado
  try {
    const restaurant = await newRestaurant.save()
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  // Only returns PUBLIC information of restaurants
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId, {
      attributes: { exclude: ['userId'] },
      include: [{
        model: Product,
        as: 'products',
        include: { model: ProductCategory, as: 'productCategory' }
      },
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      }],
      order: [[{ model: Product, as: 'products' }, 'order', 'ASC']]
    }
    )
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const update = async function (req, res) {
  try {
    await Restaurant.update(req.body, { where: { id: req.params.restaurantId } })
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const destroy = async function (req, res) {
  try {
    const result = await Restaurant.destroy({ where: { id: req.params.restaurantId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted restaurant id.' + req.params.restaurantId
    } else {
      message = 'Could not delete restaurant.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

/*
SI EL PROPIETARIO PULSA EL BOTÓN PARA PROMOCIONAR UN NUEVO RESTAURANTE Y YA EXISTÍAN OTROS RESTAURANTES PROMOCIONADOS DEL
MISMO DUEÑO, SE PROCEDERÁ A PROMOCIONAR EL RESTAURANTE INDICADO Y SE MARCARÁ COMO "NO PROMOCIONADO" EL RESTAURANTE QUE LO
FUESE ANTERIORMENTE.
*/
// SOLUCION
const promote = async function (req, res) {
  const t = await sequelizeSession.transaction()
  try {
    // BUSCAMOS UNO YA PROMOCIONADO
    const existingPromotedRestaurant = await Restaurant.findOne({ where: { userId: req.user.id, promoted: true } })
    // SI EXISTE
    if (existingPromotedRestaurant) {
      // LO DESPROMOCIONAMOS
      await Restaurant.update(
        { promoted: false },
        { where: { id: existingPromotedRestaurant.id } },
        { transaction: t }
      )
    }
    // PROMOCIONAMOS EL RESTAURANTE QUE QUEREMOS
    await Restaurant.update(
      { promoted: true },
      { where: { id: req.params.restaurantId } },
      { transaction: t }
    )
    await t.commit()
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    await t.rollback()
    res.status(500).send(err)
  }
}

const RestaurantController = {
  index,
  indexOwner,
  create,
  show,
  update,
  destroy,
  promote
}
export default RestaurantController
